import {
  AnimationMixer,
  Box3,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Sphere,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  type Object3D,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  type Skeleton,
  type SkinnedMesh,
  Timer,
  WebGPURenderer,
  type Material,
  type Texture,
} from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { RNCanvasContext } from 'react-native-webgpu';
import type { Slot } from '@/features/hero/domain/accessories';
import type { Equipment, Gender } from '@/features/hero/domain/Hero';
import { loadHeroGltf } from './loadHeroGltf';
import {
  footLift,
  nodeFor,
  SKIN_MATERIAL,
  visibleNodes,
  wardrobeNodes,
} from './heroWardrobe';
import { SKIN_TONES } from '../skinTones';

export interface HeroLook {
  gender: Gender;
  skinTone: number;
  equipment: Equipment;
}

const DEG = Math.PI / 180;
/** Fraction of the remaining turn covered per 1/60 s: ~0.25 s to settle a 30 degree turn. */
const EASE_PER_FRAME = 0.22;
const SETTLE_RAD = 0.0015;
/** Frame of the run cycle shown when the hero stands still (mid-stance reads well as a pose). */
const STILL_POSE_S = 0.12;
/** The avatar is ~1.6-1.75 m; the camera frames 2.05 m around the body centre. */
const FRAME_HEIGHT_M = 2.05;
const FRAME_CENTRE_Y = 0.9;
const FOV = 30;
/** Item preview: the angle it is first shown at (its interesting side toward the camera), and framing padding. */
const FOCUS_YAW_DEG: Readonly<Record<Slot, number>> = {
  top: 0,
  bottom: 0,
  shoes: -40,
  sandals: -40,
  watch: -90,
  hat: -30,
  hair: -30,
};
const FOCUS_PAD = 1.12;
const FOCUS_MIN_SIZE_M = 0.09;

function shortestDelta(from: number, to: number) {
  const full = Math.PI * 2;
  return ((((to - from) % full) + full * 1.5) % full) - Math.PI;
}

/**
 * The hero scene on WebGPU, with no React in it: one renderer, one model, deterministic disposal. React owns only the
 * canvas and forwards look, angle and play state. Frames are drawn on demand (a turn, a new item) unless `playing`,
 * which runs the run-cycle loop.
 */
export class HeroRenderer {
  private readonly renderer: WebGPURenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly turntable = new Group();
  private readonly timer = new Timer();
  private model: LoadedModel | undefined;
  private look: HeroLook | undefined;
  /** The body being loaded, so repeated look changes during a load share it instead of parsing the GLB again. */
  private pending: { gender: Gender; promise: Promise<boolean> } | undefined;
  private loadToken = 0;
  private targetY = 0;
  /** Slot shown alone (item preview), or undefined for the whole hero. */
  private focus: Slot | undefined;
  private focusYaw = 0;
  private readonly box = new Box3();
  private readonly partBox = new Box3();
  private readonly sphere = new Sphere();
  private ring: Object3D[] = [];
  /** The skeleton is in its bind pose for an item preview (the clip pose is saved in `model.savedPose`). */
  private bindPosed = false;
  /** Look or focus changed: applied once, on the next frame, however many setters ran in this tick. */
  private lookDirty = false;
  private dragging = false;
  private playing = false;
  private framePending = false;
  private initialized = false;
  private readonly ready: Promise<void>;
  private disposed = false;
  private readonly frameMs: number[] = [];
  private readonly frameGaps: number[] = [];
  private lastFrameAt = 0;

  constructor(
    private readonly context: RNCanvasContext,
    private readonly pixelWidth: number,
    private readonly pixelHeight: number,
  ) {
    this.renderer = new WebGPURenderer({
      antialias: true,
      alpha: true,
      canvas: context.canvas as never,
      context: context as never,
    });
    this.renderer.setSize(pixelWidth, pixelHeight, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = NeutralToneMapping;

    this.camera = new PerspectiveCamera(FOV, pixelWidth / pixelHeight, 0.1, 30);
    this.frameCamera();

    this.scene.add(new HemisphereLight(0xffffff, 0x2a2f3d, 1.6));
    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(1.6, 3, 2.6);
    const rim = new DirectionalLight(0x4fd8ff, 1.1);
    rim.position.set(-2.2, 1.6, -1.8);
    this.scene.add(key, rim, this.turntable);
    this.addGroundRing();
    // render() before the backend is ready throws (and from a rAF callback no error boundary sees it)
    this.ready = this.renderer.init().then(() => {
      this.initialized = true;
      this.requestFrame();
    });
  }

  /**
   * Applies gender, skin and equipment. A gender change loads the other body; the rest is applied in place.
   * Resolves `true` once this look is on screen, `false` if a newer look or `dispose()` superseded it.
   */
  async setLook(look: HeroLook): Promise<boolean> {
    this.look = look;
    await this.ready;
    if (this.disposed) return false;
    if (
      this.model?.gender === look.gender &&
      this.pending?.gender !== look.gender
    ) {
      if (this.pending) {
        this.loadToken++; // A -> B -> A: drop the B load still in flight
        this.pending = undefined;
      }
      this.invalidate();
      return true;
    }
    if (this.pending?.gender !== look.gender) {
      const token = ++this.loadToken;
      const promise = this.loadModel(look.gender, token);
      this.pending = { gender: look.gender, promise };
    }
    const placed = await this.pending!.promise;
    if (!placed || this.disposed || this.look !== look)
      return placed && this.look?.gender === look.gender;
    this.invalidate();
    return true;
  }

  /**
   * Shows one worn item alone, in the bind pose, framed to its size (`undefined`: back to the whole hero). The item is
   * the one in `look.equipment[slot]`, so a try-on look previews the tried item.
   */
  setFocus(slot: Slot | undefined) {
    if (this.focus === slot) return;
    this.focus = slot;
    this.focusYaw = slot ? FOCUS_YAW_DEG[slot] * DEG : 0;
    this.invalidate();
  }

  /** The angle on screen right now (degrees, without the item-preview yaw): a grab mid-ease starts from here. */
  currentDeg(): number {
    return (this.turntable.rotation.y - this.focusYaw) / DEG;
  }

  /** Target angle in degrees. While dragging the model follows the finger exactly; otherwise it eases there. */
  setRotation(deg: number, dragging: boolean) {
    this.targetY = deg * DEG;
    this.dragging = dragging;
    this.requestFrame();
  }

  /** Plays the run cycle with a continuous loop, or freezes the hero in a still pose and renders on demand. */
  setPlaying(playing: boolean) {
    if (this.playing === playing) return;
    this.playing = playing;
    if (playing) {
      this.timer.reset();
      this.renderer.setAnimationLoop(this.loopFrame); // waits for init() itself
    } else {
      this.renderer.setAnimationLoop(null);
      if (!this.bindPosed) this.model?.mixer.setTime(STILL_POSE_S); // an item preview keeps its bind pose
      this.requestFrame();
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.loadToken++;
    this.pending = undefined;
    this.renderer.setAnimationLoop(null);
    if (this.model) {
      this.turntable.remove(this.model.root);
      disposeModel(this.model);
      this.model = undefined;
    }
    disposeObject(this.scene);
    this.renderer.dispose();
    releaseQuadMeshListeners();
  }

  private async loadModel(gender: Gender, token: number): Promise<boolean> {
    try {
      const gltf = await loadHeroGltf(gender);
      if (this.disposed || token !== this.loadToken) {
        disposeObject(gltf.scene);
        return false;
      }
      await this.replaceModel(gender, gltf, token);
      return !this.disposed && token === this.loadToken;
    } finally {
      if (this.pending?.gender === gender && token === this.loadToken)
        this.pending = undefined;
    }
  }

  private async replaceModel(gender: Gender, gltf: GLTF, token: number) {
    const root = new Group();
    root.add(gltf.scene);
    let skin: (Material & { color: Color }) | undefined;
    gltf.scene.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false; // the run cycle moves limbs outside the bind-pose bounds
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        if (material.name === SKIN_MATERIAL)
          skin = material as Material & { color: Color };
      }
    });
    const mixer = new AnimationMixer(gltf.scene);
    const clip = gltf.animations[0];
    if (clip) mixer.clipAction(clip).play();
    mixer.setTime(STILL_POSE_S);
    // resolved once: applyLook toggles these by reference instead of searching the graph on every change
    const meshes: Mesh[] = [];
    const skeletons = new Set<Skeleton>();
    gltf.scene.traverse(object => {
      if ((object as Mesh).isMesh) meshes.push(object as Mesh);
      if ((object as SkinnedMesh).isSkinnedMesh)
        skeletons.add((object as SkinnedMesh).skeleton);
    });
    const nodes = new Map<string, Object3D>();
    for (const name of wardrobeNodes(gender)) {
      const node = gltf.scene.getObjectByName(name);
      if (node) nodes.set(name, node);
    }
    const bones = [...new Set([...skeletons].flatMap(sk => sk.bones))];
    const parts = {
      meshes,
      skeletons,
      nodes,
      bones,
      savedPose: new Float32Array(bones.length * 10),
    };
    // Pipelines are built lazily, for what is worn: pre-compiling every wardrobe item measured ~1 s of JS-thread WGSL
    // generation on each screen mount, which delayed taps. A newly worn item costs one short build on its first frame.
    if (this.disposed || token !== this.loadToken) {
      disposeModel({
        gender,
        root,
        mixer,
        skin,
        gltfScene: gltf.scene,
        ...parts,
      });
      return;
    }
    if (this.model) {
      this.turntable.remove(this.model.root);
      disposeModel(this.model);
    }
    this.turntable.add(root);
    this.model = { gender, root, mixer, skin, gltfScene: gltf.scene, ...parts };
    this.bindPosed = false; // a fresh model is in its clip pose
    if (this.look?.gender === gender) this.applyLook(); // visibility must be right before compiling
    await this.renderer.compileAsync(this.scene, this.camera); // only what is visible
  }

  /** Marks the look dirty; the next frame (demand or loop) applies it once. */
  private invalidate() {
    this.lookDirty = true;
    this.requestFrame();
  }

  private applyLook() {
    this.lookDirty = false;
    const model = this.model;
    const look = this.look;
    // during a gender change the old body stays on screen until the new one is placed: never dress it in the new look
    if (!model || !look || model.gender !== look.gender) return;
    for (const mesh of model.meshes) mesh.visible = true;
    const visible = visibleNodes(look.gender, look.equipment);
    model.nodes.forEach((node, name) => (node.visible = visible.has(name)));
    model.skin?.color.set(SKIN_TONES[look.skinTone] ?? SKIN_TONES[1]!);
    model.root.position.set(0, footLift(look.gender, look.equipment), 0);
    const item = this.focus
      ? nodeFor(look.gender, this.focus, look.equipment[this.focus])
      : undefined;
    const node = item ? model.nodes.get(item) : undefined;
    if (!node || !this.frameItem(model, node)) {
      this.restoreClipPose(model);
      this.ring.forEach(r => (r.visible = true));
      this.frameCamera();
    }
  }

  /** Item preview: only `node` visible, bind pose, centred on the turntable axis and framed to its bounds. */
  private frameItem(model: LoadedModel, node: Object3D): boolean {
    if (!this.bindPosed) {
      // save the clip pose: the mixer only writes values that changed, so constant tracks (the fingers) would never
      // come back after pose() if the bones were not restored by hand
      model.bones.forEach((bone, i) => {
        bone.position.toArray(model.savedPose, i * 10);
        bone.quaternion.toArray(model.savedPose, i * 10 + 3);
        bone.scale.toArray(model.savedPose, i * 10 + 7);
      });
      model.skeletons.forEach(skeleton => skeleton.pose());
      this.bindPosed = true;
    }
    for (const mesh of model.meshes) mesh.visible = false;
    node.traverse(object => (object.visible = true));
    const spin = this.turntable.rotation.y;
    this.turntable.rotation.y = 0;
    this.turntable.updateMatrixWorld(true);
    // bind pose: skinning is the identity, so each part's geometry bounds times its world matrix is exact (no per-vertex
    // CPU skinning)
    this.box.makeEmpty();
    node.traverse(object => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      this.box.union(
        this.partBox
          .copy(mesh.geometry.boundingBox!)
          .applyMatrix4(mesh.matrixWorld),
      );
    });
    this.turntable.rotation.y = spin;
    if (this.box.isEmpty()) return false;
    this.box.getBoundingSphere(this.sphere);
    model.root.position.sub(this.sphere.center);
    this.ring.forEach(r => (r.visible = false));
    // a sphere fits at any turn angle; fit it in the narrower field of view
    const radius =
      Math.max(this.sphere.radius, FOCUS_MIN_SIZE_M / 2) * FOCUS_PAD;
    const halfV = (FOV * DEG) / 2;
    const halfH = Math.atan(
      Math.tan(halfV) * (this.pixelWidth / this.pixelHeight),
    );
    const distance = radius / Math.sin(Math.min(halfV, halfH));
    this.camera.position.set(0, radius * 0.25, distance);
    this.camera.lookAt(0, 0, 0);
    return true;
  }

  /** Leaves the bind pose: puts back the saved clip pose (so the mixer's change check matches the scene again). */
  private restoreClipPose(model: LoadedModel) {
    if (this.bindPosed) {
      model.bones.forEach((bone, i) => {
        bone.position.fromArray(model.savedPose, i * 10);
        bone.quaternion.fromArray(model.savedPose, i * 10 + 3);
        bone.scale.fromArray(model.savedPose, i * 10 + 7);
      });
      this.bindPosed = false;
    }
  }

  private readonly loopFrame = () => {
    this.frame();
  };

  /** Bound once: no closure per frame while the turntable eases. */
  private readonly demandFrame = () => {
    this.framePending = false;
    if (this.disposed || this.playing) return;
    if (this.frame()) this.requestFrame(); // keep easing the turn until it settles
  };

  /** One frame for an on-demand change; batched so several changes in one tick render once. */
  private requestFrame() {
    if (this.playing || this.framePending || this.disposed || !this.initialized)
      return;
    this.framePending = true;
    requestAnimationFrame(this.demandFrame);
  }

  /** Draws one frame; returns true while the turntable is still moving. */
  private frame(): boolean {
    const start = __DEV__ ? performance.now() : 0;
    if (this.lookDirty) this.applyLook();
    this.timer.update();
    // After a still spell the first delta can be seconds: clamp to one 30 fps frame so a turn starts smoothly.
    const delta = Math.min(this.timer.getDelta(), 1 / 30);
    if (this.playing && this.focus === undefined)
      this.model?.mixer.update(delta);

    const remaining = shortestDelta(
      this.turntable.rotation.y,
      this.targetY + this.focusYaw,
    );
    let moving = false;
    if (Math.abs(remaining) < SETTLE_RAD || this.dragging) {
      this.turntable.rotation.y += remaining;
    } else {
      this.turntable.rotation.y +=
        remaining * (1 - Math.pow(1 - EASE_PER_FRAME, delta * 60 || 1));
      moving = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.context.present();
    if (__DEV__) this.sampleFrameTime(performance.now() - start);
    return moving;
  }

  private frameCamera() {
    const aspect = this.pixelWidth / this.pixelHeight;
    const halfV = (FOV * DEG) / 2;
    const fitHeight = FRAME_HEIGHT_M / 2 / Math.tan(halfV);
    const fitWidth = (FRAME_HEIGHT_M * 0.55) / 2 / (Math.tan(halfV) * aspect); // arms swing ~0.55 x height wide
    const distance = Math.max(fitHeight, fitWidth);
    this.camera.position.set(0, FRAME_CENTRE_Y + 0.05, distance);
    this.camera.lookAt(0, FRAME_CENTRE_Y, 0);
  }

  private addGroundRing() {
    const ring = new Mesh(
      new RingGeometry(0.42, 0.5, 48),
      new MeshBasicMaterial({
        color: 0xc8ff3d,
        transparent: true,
        opacity: 0.55,
      }),
    );
    const disc = new Mesh(
      new CircleGeometry(0.42, 48),
      new MeshBasicMaterial({
        color: 0xc8ff3d,
        transparent: true,
        opacity: 0.08,
      }),
    );
    for (const m of [ring, disc]) {
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.002;
      this.turntable.add(m);
    }
    this.ring = [ring, disc];
  }

  /**
   * Dev only: JS submit time of a frame (update + encode + present call on the JS thread, not GPU time), logged every
   * 120 loop frames. A GPU/FPS claim still needs Xcode's GPU tools.
   */
  private sampleFrameTime(ms: number) {
    if (!this.playing) return;
    const now = performance.now();
    this.frameGaps.push(this.lastFrameAt ? now - this.lastFrameAt : 0);
    this.lastFrameAt = now;
    this.frameMs.push(ms);
    if (this.frameMs.length < 120) return;
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const line = `JS submit avg ${avg(this.frameMs).toFixed(
      2,
    )} ms max ${Math.max(...this.frameMs).toFixed(2)} ms | frame gap avg ${avg(
      this.frameGaps.slice(1),
    ).toFixed(2)} ms max ${Math.max(...this.frameGaps.slice(1)).toFixed(2)} ms`;
    this.frameMs.length = 0;
    this.frameGaps.length = 0;
    console.log(`[HeroRenderer] ${line}`);
  }
}

interface LoadedModel {
  gender: Gender;
  root: Group;
  gltfScene: Object3D;
  mixer: AnimationMixer;
  skin?: Material & { color: Color };
  meshes: Mesh[];
  skeletons: Set<Skeleton>;
  /** Wardrobe node name -> node. */
  nodes: Map<string, Object3D>;
  bones: Object3D[];
  /** position(3) quaternion(4) scale(3) per bone: the clip pose saved while an item preview shows the bind pose. */
  savedPose: Float32Array;
}

function disposeModel(model: LoadedModel) {
  model.mixer.stopAllAction();
  model.mixer.uncacheRoot(model.gltfScene);
  const skeletons = new Set<{ dispose(): void }>();
  model.skeletons.forEach(skeleton => skeletons.add(skeleton));
  skeletons.forEach(skeleton => skeleton.dispose());
  disposeObject(model.root);
}

/** Frees geometries, materials and textures (and their decoded native bitmaps) under an object. */
function disposeObject(root: Object3D) {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if ((value as Texture | null)?.isTexture) {
          const texture = value as Texture;
          texture.dispose();
          (texture.image as { close?: () => void } | undefined)?.close?.(); // react-native-webgpu ImageBitmap
        }
      }
      material.dispose();
    }
  });
}

/**
 * three's shared QuadMesh geometry keeps 'dispose' listeners of every renderer that used it, which roots a disposed
 * renderer forever (react-native-webgpu issue #445). Safe while the app has at most one live renderer at a time.
 */
function releaseQuadMeshListeners() {
  const THREE = require('three/webgpu') as {
    QuadMesh?: new () => {
      geometry: { index: unknown; attributes: Record<string, unknown> };
    };
  };
  if (!THREE.QuadMesh) return;
  const quad = new THREE.QuadMesh();
  for (const target of [
    quad.geometry,
    quad.geometry.index,
    ...Object.values(quad.geometry.attributes),
  ]) {
    const t = target as { _listeners?: Record<string, unknown> } | null;
    if (t && t._listeners) t._listeners = {};
  }
}
