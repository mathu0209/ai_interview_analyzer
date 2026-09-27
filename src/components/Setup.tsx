import { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Settings, Play, ArrowRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { InterviewCategory } from '@/lib/interviewEngine';
import { initFaceModel } from '@/lib/faceModel';
import { initEmbeddingModel } from '@/lib/embeddingModel';

interface SetupProps {
  onStart: (category: InterviewCategory, numQuestions: number) => void;
  onViewHistory: () => void;
  startError?: string;
}

export function Setup({ onStart, onViewHistory, startError }: SetupProps) {
  const [category, setCategory] = useState<InterviewCategory>('mixed');
  const [numQuestions, setNumQuestions] = useState(5);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [micError, setMicError] = useState('');
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (startError) setStarting(false);
  }, [startError]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const testCamera = async () => {
    setCameraStatus('testing');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('ok');
      // Kick off model downloads in the background (non-blocking)
      initFaceModel();
      initEmbeddingModel();
    } catch (err) {
      setCameraStatus('error');
      setCameraError(
        err instanceof Error ? err.message : 'Could not access camera'
      );
    }
  };

  const testMic = async () => {
    setMicStatus('testing');
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      if (volume > 0) {
        setMicStatus('ok');
      } else {
        // Still set ok — some browsers report 0 initially
        setMicStatus('ok');
      }
      stream.getTracks().forEach((t) => t.stop());
      audioContext.close();
    } catch (err) {
      setMicStatus('error');
      setMicError(err instanceof Error ? err.message : 'Could not access microphone');
    }
  };

  const categories: { value: InterviewCategory; label: string; desc: string }[] = [
    { value: 'HR', label: 'HR', desc: 'General & personal questions' },
    { value: 'technical', label: 'Technical', desc: 'Programming & systems' },
    { value: 'behavioral', label: 'Behavioral', desc: 'Past experiences & scenarios' },
    { value: 'mixed', label: 'Mixed', desc: 'All categories combined' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-3xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-800">Interview Setup</h1>
          </div>
          <button
            onClick={onViewHistory}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View History
          </button>
        </div>

        {/* Device testing */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Test Your Devices</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {cameraStatus === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-slate-600" />
                  </div>
                )}
              </div>
              <button
                onClick={testCamera}
                disabled={cameraStatus === 'testing'}
                className="w-full py-2.5 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
              >
                {cameraStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {cameraStatus === 'ok' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {cameraStatus === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                {cameraStatus === 'idle' && <Camera className="w-4 h-4" />}
                {cameraStatus === 'testing' ? 'Testing...' : cameraStatus === 'ok' ? 'Camera Working' : 'Test Camera'}
              </button>
              {cameraError && <p className="text-xs text-red-600 mt-2">{cameraError}</p>}
            </div>
            <div>
              <div className="relative bg-slate-900 rounded-xl aspect-video mb-3 flex items-center justify-center">
                <Mic className="w-10 h-10 text-slate-600" />
              </div>
              <button
                onClick={testMic}
                disabled={micStatus === 'testing'}
                className="w-full py-2.5 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
              >
                {micStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {micStatus === 'ok' && <CheckCircle className="w-4 h-4 text-green-600" />}
                {micStatus === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                {micStatus === 'idle' && <Mic className="w-4 h-4" />}
                {micStatus === 'testing' ? 'Testing...' : micStatus === 'ok' ? 'Microphone Working' : 'Test Microphone'}
              </button>
              {micError && <p className="text-xs text-red-600 mt-2">{micError}</p>}
            </div>
          </div>
        </div>

        {/* Category selection */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Choose Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  category === cat.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-semibold text-slate-800 text-sm">{cat.label}</p>
                <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Number of questions */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Number of Questions</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={15}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-2xl font-bold text-blue-600 w-12 text-center">
              {numQuestions}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setStarting(true);
            onStart(category, numQuestions);
          }}
          disabled={starting}
          className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          {starting ? 'Starting...' : 'Start Interview'}
          {!starting && <ArrowRight className="w-5 h-5" />}
        </button>
        {startError && (
          <p className="text-center text-sm text-red-600 mt-3">{startError}</p>
        )}
        {(cameraStatus !== 'ok' || micStatus !== 'ok') && (
          <p className="text-center text-sm text-slate-500 mt-3">
            Tip: test your camera and microphone first for best results
          </p>
        )}
      </div>
    </div>
  );
}
