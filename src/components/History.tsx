import { useState, useEffect } from 'react';
import { Home, TrendingUp, Calendar, Award, ChevronRight } from 'lucide-react';
import { SessionLineChart, SessionLineData } from './charts/SessionLineChart';
import { loadSessions, SessionRow, AnswerRow } from '@/lib/database';

interface HistoryProps {
  onHome: () => void;
}

export function History({ onHome }: HistoryProps) {
  const [sessions, setSessions] = useState<(SessionRow & { answers?: AnswerRow[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSessions()
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const chartData: SessionLineData[] = [...sessions]
    .filter((s) => s.final_score !== null)
    .reverse()
    .map((s, i) => ({
      session: `#${i + 1}`,
      score: Math.round(s.final_score ?? 0),
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">Practice History</h1>
          </div>
          <button
            onClick={onHome}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> New Interview
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Award className="w-8 h-8 text-blue-600 animate-pulse" />
            <span className="ml-3 text-slate-500">Loading history...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-12 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No practice sessions yet. Start your first interview!</p>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <>
            {chartData.length > 1 && (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" /> Score Progress Over Time
                </h3>
                <SessionLineChart data={chartData} />
              </div>
            )}

            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50">
                      <span className="text-xl font-bold text-blue-600">
                        {session.final_score ? Math.round(session.final_score) : '—'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 capitalize">
                        {session.category} Interview
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {session.created_at
                            ? new Date(session.created_at).toLocaleDateString()
                            : ''}
                        </span>
                        <span>{session.answers?.length ?? 0} questions</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
