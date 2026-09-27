/*
# AI Interview Analyzer — sessions, answers, scores

1. New Tables
- `sessions`: a single mock-interview session (one per practice run)
  - id (uuid PK)
  - category (text: HR, technical, behavioral)
  - num_questions (int)
  - final_score (numeric 0-100, nullable until session completes)
  - created_at (timestamptz)
- `answers`: one row per question answered within a session
  - id (uuid PK)
  - session_id (uuid FK -> sessions.id ON DELETE CASCADE)
  - question_id (int)
  - question_text (text)
  - category (text)
  - transcript (text)
  - duration_sec (int)
  - content_score (numeric 0-100)
  - speech_score (numeric 0-100)
  - face_score (numeric 0-100)
  - created_at (timestamptz)
- `scores`: detailed per-answer metrics (one row per answer)
  - id (uuid PK)
  - answer_id (uuid FK -> answers.id ON DELETE CASCADE)
  - wpm (numeric)
  - pause_count (int)
  - filler_count (int)
  - filler_words (jsonb)
  - eye_contact_pct (numeric)
  - head_stability (numeric)
  - expression (text)
  - keyword_coverage (numeric 0-1)
  - similarity (numeric 0-1)
  - strengths (jsonb)
  - improvements (jsonb)
  - created_at (timestamptz)

2. Security
- Enable RLS on all three tables.
- Single-tenant app (no sign-in): allow anon + authenticated full CRUD.
- USING (true) / WITH CHECK (true) is acceptable because data is intentionally shared/public.

3. Notes
- Cascade deletes keep data consistent: deleting a session removes its answers and scores.
- All score columns are nullable so partial saves (per-answer) work mid-session.
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  num_questions int NOT NULL DEFAULT 5,
  final_score numeric(5,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON sessions;
CREATE POLICY "anon_select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON sessions;
CREATE POLICY "anon_delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_id int NOT NULL,
  question_text text NOT NULL,
  category text NOT NULL,
  transcript text NOT NULL DEFAULT '',
  duration_sec int NOT NULL DEFAULT 0,
  content_score numeric(5,2),
  speech_score numeric(5,2),
  face_score numeric(5,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_answers" ON answers;
CREATE POLICY "anon_select_answers" ON answers FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_answers" ON answers;
CREATE POLICY "anon_insert_answers" ON answers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_answers" ON answers;
CREATE POLICY "anon_update_answers" ON answers FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_answers" ON answers;
CREATE POLICY "anon_delete_answers" ON answers FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  wpm numeric(5,2),
  pause_count int,
  filler_count int,
  filler_words jsonb,
  eye_contact_pct numeric(5,2),
  head_stability numeric(5,2),
  expression text,
  keyword_coverage numeric(4,3),
  similarity numeric(4,3),
  strengths jsonb,
  improvements jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scores" ON scores;
CREATE POLICY "anon_select_scores" ON scores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scores" ON scores;
CREATE POLICY "anon_insert_scores" ON scores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scores" ON scores;
CREATE POLICY "anon_update_scores" ON scores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scores" ON scores;
CREATE POLICY "anon_delete_scores" ON scores FOR DELETE
  TO anon, authenticated USING (true);
