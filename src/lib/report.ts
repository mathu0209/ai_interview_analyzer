import jsPDF from 'jspdf';
import { DISCLAIMER } from '@/config';
import type { FusionResult } from '@/config';
import type { SpeechAnalysisResult } from './speechModel';
import type { FaceAnalysisResult } from './faceModel';
import type { AnswerEvaluationResult } from './answerEvaluator';

export interface ReportAnswerData {
  questionText: string;
  category: string;
  transcript: string;
  durationSec: number;
  fusion: FusionResult;
  speech: SpeechAnalysisResult;
  face: FaceAnalysisResult;
  answerEval: AnswerEvaluationResult;
}

export function generateReport(
  sessionCategory: string,
  finalScore: number,
  answers: ReportAnswerData[]
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Interview Analyzer — Report', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Category: ${sessionCategory}  |  Date: ${new Date().toLocaleDateString()}`, margin, y);
  y += 6;
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40);
  doc.text(`${finalScore}/100`, margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, pageWidth - margin * 2);
  doc.text(disclaimerLines, margin, y);
  y += disclaimerLines.length * 4 + 4;

  // Per-answer breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Answer Breakdown', margin, y);
  y += 7;

  answers.forEach((ans, i) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    const qLines = doc.splitTextToSize(`Q${i + 1}: ${ans.questionText}`, pageWidth - margin * 2);
    doc.text(qLines, margin, y);
    y += qLines.length * 5 + 1;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(
      `Score: ${ans.fusion.finalScore}/100  |  Content: ${ans.fusion.breakdown[0].score}  Speech: ${ans.fusion.breakdown[1].score}  Face: ${ans.fusion.breakdown[2].score}`,
      margin,
      y
    );
    y += 5;
    doc.text(
      `WPM: ${ans.speech.wpm}  |  Pauses: ${ans.speech.pauseCount}  |  Fillers: ${ans.speech.fillerCount}  |  Eye Contact: ${ans.face.eyeContactPct}%`,
      margin,
      y
    );
    y += 5;
    doc.text(`Expression: ${ans.face.expression}  |  Keyword Coverage: ${Math.round(ans.answerEval.keywordCoverage * 100)}%`, margin, y);
    y += 5;

    // Transcript (truncated)
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80);
    const transcriptLines = doc.splitTextToSize(
      `Transcript: ${ans.transcript.slice(0, 300)}${ans.transcript.length > 300 ? '...' : ''}`,
      pageWidth - margin * 2
    );
    doc.text(transcriptLines, margin, y);
    y += transcriptLines.length * 4 + 2;

    // Strengths
    if (ans.fusion.strengths.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 100, 0);
      doc.text('Strengths:', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (const s of ans.fusion.strengths) {
        const lines = doc.splitTextToSize(`+ ${s}`, pageWidth - margin * 2 - 4);
        doc.text(lines, margin + 4, y);
        y += lines.length * 3.5;
      }
      doc.setFontSize(9);
    }

    // Improvements
    if (ans.fusion.improvements.length > 0) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(150, 0, 0);
      doc.text('Improvements:', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (const imp of ans.fusion.improvements) {
        const lines = doc.splitTextToSize(`- ${imp}`, pageWidth - margin * 2 - 4);
        doc.text(lines, margin + 4, y);
        y += lines.length * 3.5;
      }
      doc.setFontSize(9);
    }

    y += 5;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  });

  doc.save(`interview-report-${Date.now()}.pdf`);
}
