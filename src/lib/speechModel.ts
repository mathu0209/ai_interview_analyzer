import { FILLER_WORDS, SPEECH_CONFIG } from '@/config';

export interface SpeechSegment {
  text: string;
  timestamp: number;
}

export interface SpeechAnalysisResult {
  wpm: number;
  pauseCount: number;
  fillerCount: number;
  fillerWords: Record<string, number>;
  score: number;
  wordCount: number;
}

export function analyzeSpeech(
  transcript: string,
  segments: SpeechSegment[],
  durationSec: number
): SpeechAnalysisResult {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const minutes = durationSec > 0 ? durationSec / 60 : 1;
  const wpm = Math.round(wordCount / minutes);

  // Count pauses (gaps between segments > threshold)
  let pauseCount = 0;
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].timestamp - segments[i - 1].timestamp;
    if (gap >= SPEECH_CONFIG.pauseThresholdMs) pauseCount++;
  }

  // Count filler words
  const lowerTranscript = transcript.toLowerCase();
  const fillerWords: Record<string, number> = {};
  let fillerCount = 0;
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = lowerTranscript.match(regex);
    if (matches) {
      fillerWords[filler] = matches.length;
      fillerCount += matches.length;
    }
  }

  // Score calculation
  let score = 100;

  // WPM score: ideal range gets full marks, penalize outside
  const { idealWpm, wpmTolerance, maxWpm, minWpm } = SPEECH_CONFIG;
  if (wpm < minWpm || wpm > maxWpm) {
    score -= 30;
  } else if (wpm < idealWpm - wpmTolerance || wpm > idealWpm + wpmTolerance) {
    const deviation = Math.abs(wpm - idealWpm) - wpmTolerance;
    score -= Math.min(20, deviation * 0.5);
  }

  // Pause penalty: too few or too many pauses
  if (pauseCount === 0 && wordCount > 20) {
    score -= 10;
  } else if (pauseCount > SPEECH_CONFIG.idealPauseCount * 3) {
    score -= 15;
  }

  // Filler word penalty
  const fillerPenalty = Math.min(
    SPEECH_CONFIG.maxFillerPenalty,
    fillerCount * SPEECH_CONFIG.fillerPenaltyPerWord
  );
  score -= fillerPenalty;

  // Too short answer penalty
  if (wordCount < 10) score -= 20;

  score = Math.max(0, Math.min(100, score));

  return {
    wpm,
    pauseCount,
    fillerCount,
    fillerWords,
    score: Math.round(score),
    wordCount,
  };
}
