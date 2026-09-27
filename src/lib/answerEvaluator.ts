import { computeSimilarity } from './embeddingModel';
import { analyzeNlp } from './nlpModel';

export interface AnswerEvaluationResult {
  score: number;
  similarity: number;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export async function evaluateAnswer(
  transcript: string,
  idealAnswer: string,
  keywords: string[]
): Promise<AnswerEvaluationResult> {
  const similarity = await computeSimilarity(transcript, idealAnswer);

  const lowerTranscript = transcript.toLowerCase();
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  for (const kw of keywords) {
    if (lowerTranscript.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }
  const keywordCoverage = keywords.length > 0
    ? matchedKeywords.length / keywords.length
    : 0;

  const nlp = analyzeNlp(transcript);

  const keywordScore = keywordCoverage * 100;
  const lengthGrammarScore = (nlp.lengthScore + nlp.grammarScore) / 2;

  let score: number;
  if (similarity > 0) {
    // Semantic similarity available: 50% similarity, 30% keywords, 20% length/grammar
    score = similarity * 100 * 0.5 + keywordScore * 0.3 + lengthGrammarScore * 0.2;
  } else {
    // Embedding model unavailable: fall back to 60% keywords, 40% length/grammar
    score = keywordScore * 0.6 + lengthGrammarScore * 0.4;
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    similarity: Math.round(similarity * 1000) / 1000,
    keywordCoverage: Math.round(keywordCoverage * 1000) / 1000,
    matchedKeywords,
    missingKeywords,
  };
}
