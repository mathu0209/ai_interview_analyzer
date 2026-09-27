import { SCORE_WEIGHTS, SCORE_THRESHOLDS, FusionResult, ScoreBreakdown } from '@/config';
import type { SpeechAnalysisResult } from './speechModel';
import type { FaceAnalysisResult } from './faceModel';
import type { AnswerEvaluationResult } from './answerEvaluator';

export function fuseScores(
  contentScore: number,
  speechResult: SpeechAnalysisResult,
  faceResult: FaceAnalysisResult,
  answerEval: AnswerEvaluationResult
): FusionResult {
  const speechScore = speechResult.score;
  const faceScore = faceResult.score;

  const finalScore =
    contentScore * SCORE_WEIGHTS.content +
    speechScore * SCORE_WEIGHTS.speech +
    faceScore * SCORE_WEIGHTS.face;

  const breakdown: ScoreBreakdown[] = [
    { category: 'content', score: Math.round(contentScore), weight: SCORE_WEIGHTS.content },
    { category: 'speech', score: Math.round(speechScore), weight: SCORE_WEIGHTS.speech },
    { category: 'face', score: Math.round(faceScore), weight: SCORE_WEIGHTS.face },
  ];

  const strengths: string[] = [];
  const improvements: string[] = [];

  // Content strengths/improvements
  if (contentScore >= SCORE_THRESHOLDS.good) {
    strengths.push('Strong answer content with good relevance to the ideal answer');
  } else if (contentScore < SCORE_THRESHOLDS.fair) {
    improvements.push('Try to align your answer more closely with key concepts and keywords');
  }
  if (answerEval.matchedKeywords.length > 0) {
    strengths.push(`Covered key topics: ${answerEval.matchedKeywords.join(', ')}`);
  }
  if (answerEval.missingKeywords.length > 0) {
    improvements.push(`Consider mentioning: ${answerEval.missingKeywords.join(', ')}`);
  }

  // Speech strengths/improvements
  const { wpm, pauseCount, fillerCount } = speechResult;
  if (wpm >= 100 && wpm <= 180) {
    strengths.push(`Good speaking pace (${wpm} WPM)`);
  } else if (wpm < 100) {
    improvements.push(`Speaking pace was slow (${wpm} WPM) — try to speak a bit faster`);
  } else {
    improvements.push(`Speaking pace was fast (${wpm} WPM) — slow down for clarity`);
  }
  if (fillerCount === 0) {
    strengths.push('No filler words detected');
  } else if (fillerCount <= 2) {
    improvements.push(`A few filler words (${fillerCount}) — practice speaking without them`);
  } else {
    improvements.push(`Many filler words (${fillerCount}) — practice reducing "um", "uh", "like"`);
  }
  if (pauseCount > 0 && pauseCount <= 8) {
    strengths.push('Good use of pauses for emphasis');
  } else if (pauseCount === 0 && speechResult.wordCount > 20) {
    improvements.push('Add pauses to structure your answer and give listeners time to absorb');
  }

  // Face strengths/improvements
  if (faceResult.eyeContactPct >= 70) {
    strengths.push(`Strong eye contact (${faceResult.eyeContactPct}%)`);
  } else if (faceResult.eyeContactPct < 50) {
    improvements.push(`Work on maintaining eye contact with the camera (currently ${faceResult.eyeContactPct}%)`);
  }
  if (faceResult.headStability >= 70) {
    strengths.push('Calm and steady head posture');
  } else if (faceResult.headStability < 40) {
    improvements.push('Try to keep your head more stable while speaking');
  }
  if (faceResult.expression === 'smiling' || faceResult.expression === 'slight smile') {
    strengths.push('Positive and approachable expression');
  }

  return {
    finalScore: Math.round(Math.max(0, Math.min(100, finalScore))),
    breakdown,
    strengths,
    improvements,
  };
}
