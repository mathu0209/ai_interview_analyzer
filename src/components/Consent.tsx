import { useState } from 'react';
import { ShieldCheck, Camera, Mic, Video, Lock } from 'lucide-react';
import { DISCLAIMER } from '@/config';

interface ConsentProps {
  onConsent: () => void;
}

export function Consent({ onConsent }: ConsentProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">AI Interview Analyzer</h1>
          </div>
          <p className="text-blue-100 mt-1 text-sm">Your personal mock-interview coach</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-slate-800 text-lg">Privacy & Data Usage</h2>
              <p className="text-slate-600 text-sm mt-1">
                This app uses your camera and microphone to analyze your practice interview
                answers. Video and audio are processed locally in your browser and are{' '}
                <strong>never uploaded</strong>. Only your scores and transcripts are saved to
                track your progress.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <Camera className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Camera</p>
                <p className="text-xs text-slate-500">Face analysis only</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <Mic className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Microphone</p>
                <p className="text-xs text-slate-500">Speech transcription</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{DISCLAIMER}</p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">
              I understand and consent to the use of my camera and microphone for practice
              interview analysis.
            </span>
          </label>

          <button
            onClick={onConsent}
            disabled={!agreed}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
