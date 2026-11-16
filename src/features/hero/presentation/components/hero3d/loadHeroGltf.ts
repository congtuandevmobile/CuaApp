import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Texture } from 'three/webgpu';
import { GLTFLoader, type GLTF, type GLTFParser } from 'three/addons/loaders/GLTFLoader.js';
import type { Gender } from '@/features/hero/domain/Hero';
import { HERO_MODELS } from './heroWardrobe';

/**
 * Hermes has no TextDecoder; GLTFLoader needs it once per file to read the GLB's JSON chunk (UTF-8). A minimal
 * decoder, installed only when the engine lacks one.
 */
function ensureTextDecoder() {
  const g = globalThis as { TextDecoder?: unknown };
  if (typeof g.TextDecoder !== 'undefined') return;
  class Utf8Decoder {
    /* eslint-disable no-bitwise -- UTF-8 decoding is bit manipulation */
    decode(input?: ArrayBuffer | ArrayBufferView): string {
      if (!input) return '';
      const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      let out = '';
      for (let i = 0; i < bytes.length; ) {
        const b = bytes[i++]!;
        let cp = b;
        if (b >= 0xf0) cp = ((b & 0x07) << 18) | ((bytes[i++]! & 0x3f) << 12) | ((bytes[i++]! & 0x3f) << 6) | (bytes[i++]! & 0x3f);
        else if (b >= 0xe0) cp = ((b & 0x0f) << 12) | ((bytes[i++]! & 0x3f) << 6) | (bytes[i++]! & 0x3f);
        else if (b >= 0xc0) cp = ((b & 0x1f) << 6) | (bytes[i++]! & 0x3f);
        out += String.fromCodePoint(cp);
      }
      return out;
    }
    /* eslint-enable no-bitwise */
  }
  g.TextDecoder = Utf8Decoder;
}

/**
 * Embedded glTF images normally go through `new Blob([ArrayBuffer])` + `URL.createObjectURL`, which React Native cannot
 * do. GLTFLoader hands the raw image bytes to a loader that declares `isKTX2Loader`; this one decodes those bytes with
 * react-native-webgpu's `createImageBitmap(ArrayBuffer)` so sampler, cache and colour-space handling stay three's own.
 */
class EmbeddedImageLoader {
  readonly isKTX2Loader = true;

  parse(buffer: ArrayBuffer, onLoad: (texture: Texture) => void, onError: (error: unknown) => void) {
    // react-native-webgpu's global, extended to accept encoded image bytes
    const decode = (globalThis as unknown as { createImageBitmap: (data: ArrayBuffer) => Promise<unknown> }).createImageBitmap;
    decode(buffer)
      .then((bitmap) => {
        const texture = new Texture(bitmap as unknown as HTMLImageElement);
        texture.needsUpdate = true;
        onLoad(texture);
      })
      .catch((error: unknown) => {
        // GLTFLoader turns a failed image into an untextured mesh silently: say so in development
        if (__DEV__) console.warn('[loadHeroGltf] embedded image decode failed', error);
        onError(error);
      });
  }
}

function embeddedTexturesPlugin(parser: GLTFParser) {
  const loader = new EmbeddedImageLoader();
  return {
    name: 'CUA_rn_embedded_textures',
    loadTexture(textureIndex: number) {
      const def = parser.json.textures?.[textureIndex];
      if (!def || def.source === undefined) return null;
      const image = parser.json.images?.[def.source];
      if (!image || image.bufferView === undefined) return null; // external URIs keep the default path
      return parser.loadTextureImage(textureIndex, def.source, loader as never);
    },
  };
}

/** Bytes of the bundled GLB, read once per gender for the app's lifetime (a later mount only re-parses). */
const bytesCache = new Map<Gender, Promise<ArrayBuffer>>();

function modelBytes(gender: Gender): Promise<ArrayBuffer> {
  let pending = bytesCache.get(gender);
  if (!pending) {
    pending = (async () => {
      const asset = Asset.fromModule(HERO_MODELS[gender]);
      await asset.downloadAsync(); // dev: Metro over HTTP; release: already in the app bundle
      const uri = asset.localUri ?? asset.uri;
      return new File(uri).arrayBuffer();
    })();
    pending.catch(() => bytesCache.delete(gender)); // a failed read can be retried by the next mount
    bytesCache.set(gender, pending);
  }
  return pending;
}

/** Loads and parses the wardrobe GLB of a gender. Every call returns fresh scene objects owned by the caller. */
export async function loadHeroGltf(gender: Gender): Promise<GLTF> {
  ensureTextDecoder();
  const bytes = await modelBytes(gender);
  const loader = new GLTFLoader();
  loader.register(embeddedTexturesPlugin as never);
  return new Promise((resolve, reject) => loader.parse(bytes, '', resolve, reject));
}
