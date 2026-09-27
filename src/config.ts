export const SCORE_WEIGHTS = {
  content: 0.5,
  speech: 0.25,
  face: 0.25,
} as const;

export const SCORE_THRESHOLDS = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 0,
} as const;

export const FILLER_WORDS = [
  'um',
  'uh',
  'like',
  'you know',
  'basically',
  'actually',
  'literally',
  'kind of',
  'sort of',
  'i mean',
  'so yeah',
  'right',
  'honestly',
  'okay so',
  'well',
  'so um',
];

export const SPEECH_CONFIG = {
  idealWpm: 140,
  wpmTolerance: 40,
  maxWpm: 200,
  minWpm: 80,
  pauseThresholdMs: 700,
  idealPauseCount: 3,
  maxFillerPenalty: 30,
  fillerPenaltyPerWord: 4,
};

export const FACE_CONFIG = {
  sampleIntervalMs: 500,
  minFramesForScore: 5,
  eyeContactThreshold: 0.15,
  headPoseStabilityThreshold: 0.08,
};

export const DISCLAIMER =
  'Feedback is for practice only. Facial expressions do not reliably measure confidence or personality.';

export type ScoreCategory = 'content' | 'speech' | 'face';

export interface ScoreBreakdown {
  category: ScoreCategory;
  score: number;
  weight: number;
}

export interface FusionResult {
  finalScore: number;
  breakdown: ScoreBreakdown[];
  strengths: string[];
  improvements: string[];
}
