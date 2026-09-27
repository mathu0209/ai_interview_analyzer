import questionsData from '@/data/questions.json';

export interface InterviewQuestion {
  id: number;
  category: string;
  question: string;
  ideal_answer: string;
  keywords: string[];
}

export type InterviewCategory = 'HR' | 'technical' | 'behavioral' | 'mixed';

export function getQuestions(
  category: InterviewCategory,
  count: number
): InterviewQuestion[] {
  let pool: InterviewQuestion[];
  if (category === 'mixed') {
    pool = questionsData as InterviewQuestion[];
  } else {
    pool = (questionsData as InterviewQuestion[]).filter(
      (q) => q.category === category
    );
  }
  // Shuffle and pick count
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getAllQuestions(): InterviewQuestion[] {
  return questionsData as InterviewQuestion[];
}
