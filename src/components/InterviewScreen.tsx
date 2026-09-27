import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Mic, Square, ArrowRight, Loader2, Clock, AlertCircle } from 'lucide-react';
import { FACE_CONFIG, DISCLAIMER } from '@/config';
import { analyzeFaceFrame, computeFaceScore, FaceFrameResult } from '@/lib/faceModel';
import { analyzeSpeech, SpeechSegment } from '@/lib/speechModel';
import { evaluateAnswer } from '@/lib/answerEvaluator';
import { fuseScores } from '@/lib/fusion';
import { saveAnswer, saveScore } from '@/lib/database';
import type { InterviewQuestion } from '@/lib/interviewEngine';
import type { AnswerResult } from '@/lib/types';

interface InterviewScreenProps {
  questions: InterviewQuestion[];
  sessionId: string;
  onComplete: (results: AnswerResult[]) => void;
}

export function InterviewScreen({ questions, sessionId, onComplete }: InterviewScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'analyzing'>('idle');
  const [transcript, setTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<AnswerResult[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const segmentsRef = useRef<SpeechSegment[]>([]);
  const faceFramesRef = useRef<FaceFrameResult[]>([]);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const fullTranscriptRef = useRef('');
  const phaseRef = useRef<'idle' | 'recording' | 'analyzing'>('idle');

  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="text-slate-700 font-medium mb-2">No questions available</p>
          <p className="text-sm text-slate-500">Please go back and try a different category.</p>
        </div>
      </div>
    );
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopAllTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  const startRecording = useCallback(async () => {
    setError('');
    setTranscript('');
    setElapsed(0);
    fullTranscriptRef.current = '';
    segmentsRef.current = [];
    faceFramesRef.current = [];
    setPhase('recording');
    phaseRef.current = 'recording';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start face analysis loop
      faceIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const frame = await analyzeFaceFrame(videoRef.current);
          if (frame) faceFramesRef.current.push(frame);
        }
      }, FACE_CONFIG.sampleIntervalMs);

      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Start speech recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalText = '';
          let interimText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript + ' ';
              segmentsRef.current.push({
                text: result[0].transcript,
                timestamp: Date.now() - startTimeRef.current,
              });
            } else {
              interimText += result[0].transcript;
            }
          }
          fullTranscriptRef.current += finalText;
          setTranscript(fullTranscriptRef.current + interimText);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setError(`Speech recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          if (phaseRef.current === 'recording') {
            try {
              recognition.start();
            } catch {
              // already started
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        setError('Speech recognition not supported in this browser. You can still record — transcript will be empty.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not access camera/microphone'
      );
      setPhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(async () => {
    setPhase('analyzing');
    phaseRef.current = 'analyzing';

    // Stop recording
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (faceIntervalRef.current) {
      clearInterval(faceIntervalRef.current);
      faceIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopAllTracks();

    const durationSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const finalTranscript = fullTranscriptRef.current.trim() || transcript.trim();

    try {
      // Run all analyses
      const speechResult = analyzeSpeech(
        finalTranscript,
        segmentsRef.current,
        durationSec
      );
      const faceResult = computeFaceScore(faceFramesRef.current);
      const answerEval = await evaluateAnswer(
        finalTranscript,
        currentQuestion.ideal_answer,
        currentQuestion.keywords
      );
      const fusion = fuseScores(
        answerEval.score,
        speechResult,
        faceResult,
        answerEval
      );

      // Save to Supabase
      const answerId = await saveAnswer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        question_text: currentQuestion.question,
        category: currentQuestion.category,
        transcript: finalTranscript,
        duration_sec: durationSec,
        content_score: fusion.breakdown[0].score,
        speech_score: fusion.breakdown[1].score,
        face_score: fusion.breakdown[2].score,
      });

      await saveScore({
        answer_id: answerId,
        wpm: speechResult.wpm,
        pause_count: speechResult.pauseCount,
        filler_count: speechResult.fillerCount,
        filler_words: speechResult.fillerWords,
        eye_contact_pct: faceResult.eyeContactPct,
        head_stability: faceResult.headStability,
        expression: faceResult.expression,
        keyword_coverage: answerEval.keywordCoverage,
        similarity: answerEval.similarity,
        strengths: fusion.strengths,
        improvements: fusion.improvements,
      });

      const result: AnswerResult = {
        question: currentQuestion,
        transcript: finalTranscript,
        durationSec,
        fusion,
        speech: speechResult,
        face: faceResult,
        answerEval,
      };

      const newResults = [...results, result];
      setResults(newResults);

      // Move to next question or complete
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setPhase('idle');
        phaseRef.current = 'idle';
        setTranscript('');
      } else {
        onComplete(newResults);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Analysis failed. Please try again.'
      );
      setPhase('idle');
      phaseRef.current = 'idle';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, results, sessionId, currentQuestion, transcript]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Question {currentIndex + 1} of {questions.length}
            </h1>
            <p className="text-sm text-slate-500 capitalize">{currentQuestion.category}</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-mono font-semibold text-slate-700">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 mb-6">
          <div
            className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">
            {currentQuestion.category} Question
          </p>
          <p className="text-lg text-slate-800 font-medium leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>

        {/* Webcam preview */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 mb-6">
          <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {phase === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Camera preview will appear here</p>
                </div>
              </div>
            )}
            {phase === 'recording' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-medium">Recording</span>
              </div>
            )}
            {phase === 'analyzing' && (
              <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">Analyzing your answer...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live transcript */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 mb-6 min-h-[100px]">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Live Transcript
            </p>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">
            {transcript || (
              <span className="text-slate-400 italic">
                {phase === 'recording'
                  ? 'Start speaking...'
                  : 'Transcript will appear here when recording'}
              </span>
            )}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          {phase === 'idle' && (
            <button
              onClick={startRecording}
              className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              Start Recording
            </button>
          )}
          {phase === 'recording' && (
            <button
              onClick={stopRecording}
              className="px-8 py-4 rounded-xl font-semibold text-white bg-slate-700 hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Square className="w-5 h-5" />
              Stop & Analyze
            </button>
          )}
          {phase === 'analyzing' && (
            <button
              disabled
              className="px-8 py-4 rounded-xl font-semibold text-white bg-slate-400 cursor-not-allowed flex items-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-400 mt-6 max-w-2xl mx-auto">
          {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
