import type { InterviewQuestion } from './interviewEngine';
import type { FusionResult } from '@/config';
import type { SpeechAnalysisResult } from './speechModel';
import type { FaceAnalysisResult } from './faceModel';
import type { AnswerEvaluationResult } from './answerEvaluator';

export interface AnswerResult {
  question: InterviewQuestion;
  transcript: string;
  durationSec: number;
  fusion: FusionResult;
  speech: SpeechAnalysisResult;
  face: FaceAnalysisResult;
  answerEval: AnswerEvaluationResult;
}
