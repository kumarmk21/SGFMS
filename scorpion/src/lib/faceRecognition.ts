import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models/face-api';
const MATCH_THRESHOLD = 0.55;

let modelLoadPromise: Promise<void> | null = null;

interface TensorBackendControls {
  setBackend: (backend: string) => Promise<boolean>;
  ready: () => Promise<void>;
}

export interface FaceDetectionResult {
  descriptor: number[];
  snapshotDataUrl: string;
}

export interface FaceMatch {
  id: string;
  distance: number;
}

export function loadFaceRecognitionModels() {
  if (!modelLoadPromise) {
    modelLoadPromise = (async () => {
      const tf = faceapi.tf as unknown as TensorBackendControls;
      await tf.setBackend('webgl');
      await tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })();
  }

  return modelLoadPromise;
}

export async function extractFaceFromVideo(video: HTMLVideoElement): Promise<FaceDetectionResult | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  return {
    descriptor: Array.from(result.descriptor),
    snapshotDataUrl: captureVideoFrame(video),
  };
}

export function findBestFaceMatch(
  descriptor: number[],
  candidates: Array<{ id: string; descriptor: number[] }>,
  threshold = MATCH_THRESHOLD
): FaceMatch | null {
  let best: FaceMatch | null = null;

  for (const candidate of candidates) {
    const distance = euclideanDistance(descriptor, candidate.descriptor);
    if (!best || distance < best.distance) {
      best = { id: candidate.id, distance };
    }
  }

  if (!best || best.distance > threshold) return null;
  return best;
}

export function captureVideoFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) return '';

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

function euclideanDistance(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const diff = left[index] - right[index];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
