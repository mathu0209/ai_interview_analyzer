export interface NlpResult {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  grammarIssues: string[];
  lengthScore: number;
  grammarScore: number;
}

export function analyzeNlp(transcript: string): NlpResult {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;
  const avgWordsPerSentence = wordCount / sentenceCount;

  // Grammar-light checks
  const grammarIssues: string[] = [];

  // Check for run-on sentences (> 40 words avg)
  if (avgWordsPerSentence > 40) {
    grammarIssues.push('Sentences may be too long or run-on');
  }

  // Check for repeated words
  const lowerWords = words.map((w) => w.toLowerCase());
  const wordFreq: Record<string, number> = {};
  for (const w of lowerWords) {
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  }
  const repeated = Object.entries(wordFreq).filter(
    ([, count]) => count > 5 && wordCount > 20
  );
  if (repeated.length > 0) {
    grammarIssues.push(`Frequently repeated: ${repeated.map((r) => r[0]).join(', ')}`);
  }

  // Check for starting with lowercase
  if (transcript.trim() && transcript.trim()[0] === transcript.trim()[0].toLowerCase()) {
    grammarIssues.push('Answer should start with a capital letter');
  }

  // Check for double spaces
  if (/\s{2,}/.test(transcript)) {
    grammarIssues.push('Multiple consecutive spaces detected');
  }

  // Length score: ideal 50-200 words
  let lengthScore = 100;
  if (wordCount < 10) lengthScore = 20;
  else if (wordCount < 20) lengthScore = 50;
  else if (wordCount < 30) lengthScore = 70;
  else if (wordCount > 250) lengthScore = 70;

  // Grammar score
  let grammarScore = 100;
  grammarScore -= grammarIssues.length * 15;
  grammarScore = Math.max(0, grammarScore);

  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    grammarIssues,
    lengthScore,
    grammarScore,
  };
}
