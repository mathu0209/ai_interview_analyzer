import { useState, useEffect } from 'react';
import { Download, Home, TrendingUp, Award, Mic, Eye, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { ScoreRadar } from './charts/ScoreRadar';
import { FillerBarChart } from './charts/FillerBarChart';
import { generateReport, ReportAnswerData } from '@/lib/report';
import { updateSessionScore } from '@/lib/database';
import { DISCLAIMER } from '@/config';
import type { AnswerResult } from '@/lib/types';

interface ResultsProps {
  sessionId: string;
  category: string;
  results: AnswerResult[];
  onRestart: () => void;
  onViewHistory: () => void;
}

export function Results({ sessionId, category, results, onRestart, onViewHistory }: ResultsProps) {
  const [saving, setSaving] = useState(false);

  const finalScore = Math.round(
    results.reduce((sum, r) => sum + r.fusion.finalScore, 0) / results.length
  );

  // Save final score to DB
  useEffect(() => {
    updateSessionScore(sessionId, finalScore).catch(() => {});
  }, [sessionId, finalScore]);

  const radarData = [
    { category: 'Content', score: Math.round(results.reduce((s, r) => s + r.fusion.breakdown[0].score, 0) / results.length), fullMark: 100 },
    { category: 'Speech', score: Math.round(results.reduce((s, r) => s + r.fusion.breakdown[1].score, 0) / results.length), fullMark: 100 },
    { category: 'Face', score: Math.round(results.reduce((s, r) => s + r.fusion.breakdown[2].score, 0) / results.length), fullMark: 100 },
  ];

  const fillerData = results.map((r, i) => ({
    question: `Q${i + 1}`,
    count: r.speech.fillerCount,
  }));

  const scoreColor =
    finalScore >= 85 ? 'text-green-600' : finalScore >= 70 ? 'text-blue-600' : finalScore >= 50 ? 'text-amber-600' : 'text-red-600';

  const scoreLabel =
    finalScore >= 85 ? 'Excellent' : finalScore >= 70 ? 'Good' : finalScore >= 50 ? 'Fair' : 'Needs Practice';

  const allStrengths = results.flatMap((r) => r.fusion.strengths);
  const allImprovements = results.flatMap((r) => r.fusion.improvements);
  const uniqueStrengths = [...new Set(allStrengths)];
  const uniqueImprovements = [...new Set(allImprovements)];

  const handleDownload = () => {
    setSaving(true);
    const reportData: ReportAnswerData[] = results.map((r) => ({
      questionText: r.question.question,
      category: r.question.category,
      transcript: r.transcript,
      durationSec: r.durationSec,
      fusion: r.fusion,
      speech: r.speech,
      face: r.face,
      answerEval: r.answerEval,
    }));
    generateReport(category, finalScore, reportData);
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Interview Results</h1>
          <div className="flex gap-3">
            <button
              onClick={onViewHistory}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" /> History
            </button>
            <button
              onClick={onRestart}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" /> New Interview
            </button>
          </div>
        </div>

        {/* Score summary */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-36 h-36 -rotate-90">
                  <circle cx="72" cy="72" r="60" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${(finalScore / 100) * 377} 377`}
                    strokeLinecap="round"
                    className={scoreColor}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${scoreColor}`}>{finalScore}</span>
                  <span className="text-xs text-slate-500">out of 100</span>
                </div>
              </div>
              <p className={`text-lg font-semibold mt-2 ${scoreColor}`}>{scoreLabel}</p>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4">
                <ScoreCard
                  icon={<Brain className="w-5 h-5 text-blue-600" />}
                  label="Content"
                  score={radarData[0].score}
                  color="bg-blue-50 text-blue-700"
                />
                <ScoreCard
                  icon={<Mic className="w-5 h-5 text-cyan-600" />}
                  label="Speech"
                  score={radarData[1].score}
                  color="bg-cyan-50 text-cyan-700"
                />
                <ScoreCard
                  icon={<Eye className="w-5 h-5 text-teal-600" />}
                  label="Face"
                  score={radarData[2].score}
                  color="bg-teal-50 text-teal-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" /> Score Breakdown
            </h3>
            <ScoreRadar data={radarData} />
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-cyan-600" /> Filler Words per Answer
            </h3>
            <FillerBarChart data={fillerData} />
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" /> Strengths
            </h3>
            {uniqueStrengths.length > 0 ? (
              <ul className="space-y-2">
                {uniqueStrengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No notable strengths detected yet.</p>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <h3 className="font-semibold text-amber-700 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" /> Areas to Improve
            </h3>
            {uniqueImprovements.length > 0 ? (
              <ul className="space-y-2">
                {uniqueImprovements.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No major improvements needed — great job!</p>
            )}
          </div>
        </div>

        {/* Per-answer breakdown */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">Answer-by-Answer Breakdown</h3>
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-blue-600 uppercase">
                      Q{i + 1} — {r.question.category}
                    </span>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {r.question.question}
                    </p>
                  </div>
                  <span className={`text-lg font-bold ${r.fusion.finalScore >= 70 ? 'text-green-600' : r.fusion.finalScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {r.fusion.finalScore}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                  <Metric label="WPM" value={r.speech.wpm.toString()} />
                  <Metric label="Pauses" value={r.speech.pauseCount.toString()} />
                  <Metric label="Fillers" value={r.speech.fillerCount.toString()} />
                  <Metric label="Eye Contact" value={`${r.face.eyeContactPct}%`} />
                </div>
                <div className="mt-2 text-xs text-slate-500 italic">
                  "{r.transcript.slice(0, 150)}{r.transcript.length > 150 ? '...' : ''}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Download report */}
        <button
          onClick={handleDownload}
          disabled={saving}
          className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download PDF Report
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">{DISCLAIMER}</p>
      </div>
    </div>
  );
}

function ScoreCard({ icon, label, score, color }: { icon: React.ReactNode; label: string; score: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{score}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <p className="text-slate-400">{label}</p>
      <p className="font-semibold text-slate-700">{value}</p>
    </div>
  );
}
