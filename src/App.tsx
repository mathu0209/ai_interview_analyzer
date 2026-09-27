import { useState, lazy, Suspense } from 'react';
import { Consent } from '@/components/Consent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getQuestions, InterviewCategory, InterviewQuestion } from '@/lib/interviewEngine';
import { createSession } from '@/lib/database';
import type { AnswerResult } from '@/lib/types';

const Setup = lazy(() =>
  import('@/components/Setup').then((m) => ({ default: m.Setup }))
);
const InterviewScreen = lazy(() =>
  import('@/components/InterviewScreen').then((m) => ({
    default: m.InterviewScreen,
  }))
);
const Results = lazy(() =>
  import('@/components/Results').then((m) => ({ default: m.Results }))
);
const History = lazy(() =>
  import('@/components/History').then((m) => ({ default: m.History }))
);

type Screen = 'consent' | 'setup' | 'interview' | 'results' | 'history';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
      <div className="text-slate-400 animate-pulse text-lg">Loading...</div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>('consent');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [startError, setStartError] = useState('');

  const handleStart = async (cat: InterviewCategory, numQ: number) => {
    setStartError('');
    try {
      const qs = getQuestions(cat, numQ);
      if (qs.length === 0) {
        setStartError('No questions found for this category.');
        return;
      }
      const id = await createSession(cat, numQ);
      setQuestions(qs);
      setSessionId(id);
      setCategory(cat);
      setResults([]);
      setScreen('interview');
    } catch (err) {
      setStartError(
        err instanceof Error
          ? `Failed to start: ${err.message}`
          : 'Failed to start the interview. Please try again.'
      );
    }
  };

  const handleComplete = (answerResults: AnswerResult[]) => {
    setResults(answerResults);
    setScreen('results');
  };

  return (
    <ErrorBoundary onReset={() => setScreen('setup')}>
      {screen === 'consent' && <Consent onConsent={() => setScreen('setup')} />}
      {screen !== 'consent' && (
        <Suspense fallback={<LoadingFallback />}>
          {screen === 'setup' && (
            <Setup onStart={handleStart} onViewHistory={() => setScreen('history')} startError={startError} />
          )}
          {screen === 'interview' && (
            <InterviewScreen
              questions={questions}
              sessionId={sessionId}
              onComplete={handleComplete}
            />
          )}
          {screen === 'results' && (
            <Results
              sessionId={sessionId}
              category={category}
              results={results}
              onRestart={() => setScreen('setup')}
              onViewHistory={() => setScreen('history')}
            />
          )}
          {screen === 'history' && <History onHome={() => setScreen('setup')} />}
        </Suspense>
      )}
    </ErrorBoundary>
  );
}

export default App;
