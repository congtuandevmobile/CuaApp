import {
  AnimationMixer,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  type Object3D,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  type SkinnedMesh,
  Timer,
  WebGPURenderer,
  type Material,
  type Texture,
} from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { RNCanvasContext } from 'react-native-webgpu';
import type { AccessoryId, Slot } from '@/features/hero/domain/accessories';
import type { Equipment, Gender } from '@/features/hero/domain/Hero';
import { SLOTS } from '@/features/hero/domain/accessories';
import { loadHeroGltf } from './loadHeroGltf';
import { nodesFor, shoeLift, SKIN_MATERIAL, WARDROBE_NODES } from './heroWardrobe';
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
    this.renderer = new WebGPURenderer({ antialias: true, alpha: true, canvas: context.canvas as never, context: context as never });
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
    if (this.model?.gender === look.gender && this.pending?.gender !== look.gender) {
      if (this.pending) {
        this.loadToken++; // A -> B -> A: drop the B load still in flight
        this.pending = undefined;
      }
      this.applyLook();
      return true;
    }
    if (this.pending?.gender !== look.gender) {
      const token = ++this.loadToken;
      const promise = this.loadModel(look.gender, token);
      this.pending = { gender: look.gender, promise };
    }
    const placed = await this.pending!.promise;
    if (!placed || this.disposed || this.look !== look) return placed && this.look?.gender === look.gender;
    this.applyLook();
    return true;
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
      this.model?.mixer.setTime(STILL_POSE_S);
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
      if (this.pending?.gender === gender && token === this.loadToken) this.pending = undefined;
    }
  }

  private async replaceModel(gender: Gender, gltf: GLTF, token: number) {
    const root = new Group();
    root.add(gltf.scene);
    let skin: (Material & { color: Color }) | undefined;
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false; // the run cycle moves limbs outside the bind-pose bounds
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (material.name === SKIN_MATERIAL) skin = material as Material & { color: Color };
      }
    });
    const mixer = new AnimationMixer(gltf.scene);
    const clip = gltf.animations[0];
    if (clip) mixer.clipAction(clip).play();
    mixer.setTime(STILL_POSE_S);
    // Pipelines are built lazily, for what is worn: pre-compiling every wardrobe item measured ~1 s of JS-thread WGSL
    // generation on each screen mount, which delayed taps. A newly worn item costs one short build on its first frame.
    if (this.disposed || token !== this.loadToken) {
      disposeModel({ gender, root, mixer, skin, gltfScene: gltf.scene });
      return;
    }
    if (this.model) {
      this.turntable.remove(this.model.root);
      disposeModel(this.model);
    }
    this.turntable.add(root);
    this.model = { gender, root, mixer, skin, gltfScene: gltf.scene };
    this.applyLook();
    await this.renderer.compileAsync(this.scene, this.camera); // only what is visible
  }

  private applyLook() {
    const model = this.model;
    const look = this.look;
    if (!model || !look) return;
    for (const name of WARDROBE_NODES) {
      const node = model.root.getObjectByName(name);
      if (node) node.visible = false;
    }
    for (const slot of SLOTS) {
      for (const name of nodesFor(slot as Slot, look.equipment[slot] as AccessoryId)) {
        const node = model.root.getObjectByName(name);
        if (node) node.visible = true;
      }
    }
    model.skin?.color.set(SKIN_TONES[look.skinTone] ?? SKIN_TONES[1]!);
    model.root.position.y = shoeLift(look.gender, look.equipment.shoes);
    this.requestFrame();
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
    if (this.playing || this.framePending || this.disposed || !this.initialized) return;
    this.framePending = true;
    requestAnimationFrame(this.demandFrame);
  }

  /** Draws one frame; returns true while the turntable is still moving. */
  private frame(): boolean {
    const start = __DEV__ ? performance.now() : 0;
    this.timer.update();
    // After a still spell the first delta can be seconds: clamp to one 30 fps frame so a turn starts smoothly.
    const delta = Math.min(this.timer.getDelta(), 1 / 30);
    if (this.playing) this.model?.mixer.update(delta);

    const remaining = shortestDelta(this.turntable.rotation.y, this.targetY);
    let moving = false;
    if (Math.abs(remaining) < SETTLE_RAD || this.dragging) {
      this.turntable.rotation.y += remaining;
    } else {
      this.turntable.rotation.y += remaining * (1 - Math.pow(1 - EASE_PER_FRAME, delta * 60 || 1));
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
    const ring = new Mesh(new RingGeometry(0.42, 0.5, 48), new MeshBasicMaterial({ color: 0xc8ff3d, transparent: true, opacity: 0.55 }));
    const disc = new Mesh(new CircleGeometry(0.42, 48), new MeshBasicMaterial({ color: 0xc8ff3d, transparent: true, opacity: 0.08 }));
    for (const m of [ring, disc]) {
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.002;
      this.turntable.add(m);
    }
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
    const line = `JS submit avg ${avg(this.frameMs).toFixed(2)} ms max ${Math.max(...this.frameMs).toFixed(2)} ms | frame gap avg ${avg(this.frameGaps.slice(1)).toFixed(2)} ms max ${Math.max(...this.frameGaps.slice(1)).toFixed(2)} ms`;
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
}

function disposeModel(model: LoadedModel) {
  model.mixer.stopAllAction();
  model.mixer.uncacheRoot(model.gltfScene);
  const skeletons = new Set<{ dispose(): void }>();
  model.root.traverse((object) => {
    const skinned = object as SkinnedMesh;
    if (skinned.isSkinnedMesh && skinned.skeleton) skeletons.add(skinned.skeleton);
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
  disposeObject(model.root);
}

/** Frees geometries, materials and textures (and their decoded native bitmaps) under an object. */
function disposeObject(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
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
  const THREE = require('three/webgpu') as { QuadMesh?: new () => { geometry: { index: unknown; attributes: Record<string, unknown> } } };
  if (!THREE.QuadMesh) return;
  const quad = new THREE.QuadMesh();
  for (const target of [quad.geometry, quad.geometry.index, ...Object.values(quad.geometry.attributes)]) {
    const t = target as { _listeners?: Record<string, unknown> } | null;
    if (t && t._listeners) t._listeners = {};
  }
}
