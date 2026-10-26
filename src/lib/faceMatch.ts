import path from "path";
import sharp from "sharp";

// Free, open-source face matching that runs on our own server (no per-check cost): @vladmandic/face-api (TensorFlow.js,
// WebAssembly backend, models bundled in the package). Each face becomes a 128-number descriptor; two faces of the same
// person are close together. The distance is turned into a 0-100 "match" score where the library's standard same-person
// cutoff (distance 0.6) is exactly 50, so "50 or more" means "probably the same person".
//
// The result is a decision aid, not proof: a card photo is small and old, light and angle vary. That is why a few failed
// tries go to an admin instead of locking the pro out, and why the minimum score is a setting (Admin > Settings).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FaceApi = any;
let ready: Promise<FaceApi> | null = null;

const MODEL_DIR = path.join(process.cwd(), "node_modules", "@vladmandic", "face-api", "model");
const WASM_DIR = path.join(process.cwd(), "node_modules", "@tensorflow", "tfjs-backend-wasm", "dist") + path.sep;

async function load(): Promise<FaceApi> {
  if (!ready) {
    ready = (async () => {
      // Required at run time (not bundled): these are large and only the face check needs them.
      const tf = await import("@tensorflow/tfjs");
      const wasm = await import("@tensorflow/tfjs-backend-wasm");
      wasm.setWasmPaths(WASM_DIR);
      await tf.setBackend("wasm");
      await tf.ready();
      const faceapi = (await import("@vladmandic/face-api/dist/face-api.node-wasm.js")) as FaceApi;
      await faceapi.tf.setBackend("wasm");
      await faceapi.tf.ready();
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_DIR);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_DIR);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_DIR);
      return faceapi;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** The 128-number face descriptor of the largest face in a photo, or null when no face is found. */
export async function faceDescriptor(image: Buffer): Promise<number[] | null> {
  const faceapi = await load();
  // Decode, honour the phone's rotation, shrink (speed) and flatten to plain RGB.
  const { data, info } = await sharp(image).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const tensor = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
  try {
    const result = await faceapi
      .detectSingleFace(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return result ? Array.from(result.descriptor as Float32Array) : null;
  } finally {
    tensor.dispose();
  }
}

export function faceDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

/** 0-100 match score: distance 0 = 100, the standard same-person cutoff 0.6 = 50, 1.2 or more = 0. */
export function matchScore(distance: number): number {
  return Math.max(0, Math.min(100, Math.round(100 * (1 - distance / 1.2))));
}
