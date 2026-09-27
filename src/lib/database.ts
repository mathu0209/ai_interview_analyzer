import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '') as string;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '') as string;

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export interface SessionRow {
  id?: string;
  category: string;
  num_questions: number;
  final_score?: number | null;
  created_at?: string;
}

export interface AnswerRow {
  id?: string;
  session_id: string;
  question_id: number;
  question_text: string;
  category: string;
  transcript: string;
  duration_sec: number;
  content_score?: number | null;
  speech_score?: number | null;
  face_score?: number | null;
  created_at?: string;
}

export interface ScoreRow {
  id?: string;
  answer_id: string;
  wpm?: number | null;
  pause_count?: number | null;
  filler_count?: number | null;
  filler_words?: Record<string, number> | null;
  eye_contact_pct?: number | null;
  head_stability?: number | null;
  expression?: string | null;
  keyword_coverage?: number | null;
  similarity?: number | null;
  strengths?: string[] | null;
  improvements?: string[] | null;
  created_at?: string;
}

export async function createSession(
  category: string,
  numQuestions: number
): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ category, num_questions: numQuestions })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateSessionScore(
  sessionId: string,
  finalScore: number
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ final_score: finalScore })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function saveAnswer(
  answer: Omit<AnswerRow, 'id' | 'created_at'>
): Promise<string> {
  const { data, error } = await supabase
    .from('answers')
    .insert(answer)
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveScore(
  score: Omit<ScoreRow, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase.from('scores').insert(score);
  if (error) throw error;
}

export async function loadSessions(): Promise<
  (SessionRow & { answers?: AnswerRow[] })[]
> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, answers(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadSessionWithDetails(sessionId: string) {
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr) throw sErr;

  const { data: answers, error: aErr } = await supabase
    .from('answers')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (aErr) throw aErr;

  const answerIds = (answers ?? []).map((a) => a.id);
  let scores: ScoreRow[] = [];
  if (answerIds.length > 0) {
    const { data: sData, error: scErr } = await supabase
      .from('scores')
      .select('*')
      .in('answer_id', answerIds);
    if (scErr) throw scErr;
    scores = sData ?? [];
  }

  return { session, answers: answers ?? [], scores };
}
