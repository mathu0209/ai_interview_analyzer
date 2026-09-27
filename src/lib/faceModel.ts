import { FACE_CONFIG } from '@/config';

export interface FaceFrameResult {
  eyeContact: boolean;
  headPose: { pitch: number; yaw: number; roll: number };
  smileScore: number;
}

export interface FaceAnalysisResult {
  eyeContactPct: number;
  headStability: number;
  expression: string;
  score: number;
  frameCount: number;
}

let landmarker: any = null;
let landmarkerInitFailed = false;
let landmarkerPromise: Promise<any> | null = null;

const VISION_CDN_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/vision_bundle.mjs';

async function loadVisionModule(): Promise<any> {
  const module = await import(/* @vite-ignore */ VISION_CDN_URL);
  return module;
}

async function getLandmarker(): Promise<any> {
  if (landmarker) return landmarker;
  if (landmarkerInitFailed) return null;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    try {
      const vision = await loadVisionModule();
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
      );
      landmarker = await vision.FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
          numFaces: 1,
        }
      );
      return landmarker;
    } catch (err) {
      console.warn('Face model failed to load, face analysis will use fallback:', err);
      landmarkerInitFailed = true;
      return null;
    }
  })();

  return landmarkerPromise;
}

export function isFaceModelSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices;
}

export async function initFaceModel(): Promise<void> {
  await getLandmarker();
}

function dist(a: number, b: number, c: number, d: number): number {
  return Math.sqrt((a - c) ** 2 + (b - d) ** 2);
}

function analyzeFrame(landmarks: any[]): FaceFrameResult {
  const leftEye = [33, 160, 158, 133, 153, 144];
  const rightEye = [362, 385, 387, 263, 373, 380];

  const le = leftEye.map((i) => landmarks[i]);
  const re = rightEye.map((i) => landmarks[i]);

  const leftEAR =
    (dist(le[1].x, le[1].y, le[5].x, le[5].y) +
      dist(le[2].x, le[2].y, le[4].x, le[4].y)) /
    (2 * dist(le[0].x, le[0].y, le[3].x, le[3].y));
  const rightEAR =
    (dist(re[1].x, re[1].y, re[5].x, re[5].y) +
      dist(re[2].x, re[2].y, re[4].x, re[4].y)) /
    (2 * dist(re[0].x, re[0].y, re[3].x, re[3].y));

  const ear = (leftEAR + rightEAR) / 2;
  const eyeContact = ear > FACE_CONFIG.eyeContactThreshold && ear < 0.45;

  const nose = landmarks[1];
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const faceTop = landmarks[10];
  const chin = landmarks[152];

  const dx = rightEyeOuter.x - leftEyeOuter.x;
  const dy = rightEyeOuter.y - leftEyeOuter.y;
  const yaw = Math.abs(Math.atan2(dy, dx)) * (180 / Math.PI);
  const verticalDist = dist(faceTop.x, faceTop.y, chin.x, chin.y);
  const noseToChin = dist(nose.x, nose.y, chin.x, chin.y);
  const pitch = Math.abs(noseToChin / verticalDist - 0.5);
  const roll = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));

  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];
  const topLip = landmarks[13];
  const bottomLip = landmarks[14];
  const mouthWidth = dist(leftMouth.x, leftMouth.y, rightMouth.x, rightMouth.y);
  const mouthHeight = dist(topLip.x, topLip.y, bottomLip.x, bottomLip.y);
  const smileScore = mouthWidth > 0 && mouthHeight > 0
    ? Math.min(1, mouthWidth / (mouthHeight * 3))
    : 0;

  return {
    eyeContact,
    headPose: { pitch, yaw, roll },
    smileScore,
  };
}

export async function analyzeFaceFrame(
  video: HTMLVideoElement
): Promise<FaceFrameResult | null> {
  try {
    const lm = await getLandmarker();
    if (!lm) return null;
    const results = lm.detectForVideo(video, performance.now());
    if (!results.faceLandmarks || results.faceLandmarks.length === 0) return null;
    return analyzeFrame(results.faceLandmarks[0]);
  } catch {
    return null;
  }
}

export function computeFaceScore(frames: FaceFrameResult[]): FaceAnalysisResult {
  const validFrames = frames.filter((f) => f !== null);
  const frameCount = validFrames.length;

  if (frameCount < FACE_CONFIG.minFramesForScore) {
    return {
      eyeContactPct: 50,
      headStability: 50,
      expression: 'neutral',
      score: 50,
      frameCount,
    };
  }

  const eyeContactPct =
    (validFrames.filter((f) => f.eyeContact).length / frameCount) * 100;

  const yawValues = validFrames.map((f) => f.headPose.yaw);
  const pitchValues = validFrames.map((f) => f.headPose.pitch);
  const rollValues = validFrames.map((f) => f.headPose.roll);
  const yawStd = stdDev(yawValues);
  const pitchStd = stdDev(pitchValues);
  const rollStd = stdDev(rollValues);
  const headStability = Math.max(
    0,
    100 - (yawStd + pitchStd + rollStd) * 100
  );

  const avgSmile =
    validFrames.reduce((sum, f) => sum + f.smileScore, 0) / frameCount;
  const expression = avgSmile > 0.5 ? 'smiling' : avgSmile > 0.3 ? 'slight smile' : 'neutral';

  const eyeScore = Math.min(100, eyeContactPct);
  const stabilityScore = Math.min(100, headStability);
  const expressionScore = avgSmile > 0.3 ? 80 : 60;
  const score =
    eyeScore * 0.5 + stabilityScore * 0.4 + expressionScore * 0.1;

  return {
    eyeContactPct: Math.round(eyeContactPct),
    headStability: Math.round(headStability),
    expression,
    score: Math.round(Math.max(0, Math.min(100, score))),
    frameCount,
  };
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
