import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mic,
  FileText,
  RotateCcw,
  Volume2,
  CheckCircle,
} from 'lucide-react';
import { Assessment, Submission, Grading } from '../types';
import { AudioPlayerWithTimestamps } from './AudioPlayerWithTimestamps';
import { WritingViewerWithHighlight } from './WritingViewerWithHighlight';
import { RubricGradingPanel } from './RubricGradingPanel';
import { getAudioBlob } from '../utils/storage';

interface StudentGradingDetailViewProps {
  assessment: Assessment;
  submission: Submission;
  grading: Grading;
  allSubmissions: Submission[];
  onBack: () => void;
  onSelectStudent: (sub: Submission) => void;
  onUpdateGrading: (updatedGrading: Grading) => void;
  onReRecord?: (student: { studentNumber: string; studentName: string; submissionId?: string }) => void;
}

export const StudentGradingDetailView: React.FC<StudentGradingDetailViewProps> = ({
  assessment,
  submission,
  grading,
  allSubmissions,
  onBack,
  onSelectStudent,
  onUpdateGrading,
  onReRecord,
}) => {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Content type tab (if combined assessment)
  const [contentTab, setContentTab] = useState<'speaking' | 'writing'>(
    submission.submissionType === 'writing' ? 'writing' : 'speaking'
  );

  // Mobile viewport tab: 'content' (Audio/Text) vs 'rubric' (Grading/Approval)
  const [mobileViewTab, setMobileViewTab] = useState<'content' | 'rubric'>('content');

  // Active evidence highlights
  const [activeSpeakingRange, setActiveSpeakingRange] = useState<{ start_sec: number; end_sec: number } | null>(null);
  const [activeWritingIndex, setActiveWritingIndex] = useState<number | null>(null);

  // Load audio blob from indexedDB
  useEffect(() => {
    let isMounted = true;
    if (submission.audioBlobId) {
      getAudioBlob(submission.audioBlobId).then((blob) => {
        if (isMounted) setAudioBlob(blob);
      });
    } else {
      setAudioBlob(null);
    }
    return () => {
      isMounted = false;
    };
  }, [submission.audioBlobId]);

  useEffect(() => {
    if (submission.submissionType === 'writing') {
      setContentTab('writing');
    } else {
      setContentTab('speaking');
    }
    setActiveSpeakingRange(null);
    setActiveWritingIndex(null);
  }, [submission.id]);

  const currentIndex = allSubmissions.findIndex((s) => s.id === submission.id);
  const prevStudent = currentIndex > 0 ? allSubmissions[currentIndex - 1] : null;
  const nextStudent = currentIndex < allSubmissions.length - 1 ? allSubmissions[currentIndex + 1] : null;

  const highlightedSentenceIndices = (grading.aiScore.criteriaScores || [])
    .flatMap((c) => (c.evidenceWriting || []).map((e) => e.sentence_index))
    .filter((idx) => typeof idx === 'number');

  const isApproved = grading.status === 'teacher_approved';

  return (
    <div className="flex flex-col h-screen bg-[#faf8f5] overflow-hidden font-sans">
      {/* Top Header - Compact, single line, no overcrowding */}
      <header className="bg-white border-b border-[#eae5da] px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-[#525f5a] hover:text-[#142823] hover:bg-[#f5f2eb] rounded-xl transition cursor-pointer"
            title="목록으로"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="text-[11px] text-[#7c8a84] truncate hidden sm:block">
              {assessment.title}
            </div>
            <div className="text-sm sm:text-base font-bold text-[#142823] flex items-center gap-2">
              <span className="font-mono text-xs bg-[#f5f2eb] px-1.5 py-0.5 rounded text-[#525f5a]">
                {submission.studentNumber}번
              </span>
              <span className="truncate">{submission.studentName} 학생</span>
              {isApproved && (
                <span className="text-[10px] font-bold text-[#1b3831] bg-[#eaf1ed] px-2 py-0.5 rounded-full">
                  승인됨
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Previous / Re-record / Next */}
        <div className="flex items-center gap-1.5 shrink-0">
          {assessment.submissionType !== 'writing' && onReRecord && (
            <button
              onClick={() => onReRecord(submission)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-[#b4532b] bg-[#fdf3f0] hover:bg-[#fae3dd] rounded-xl border border-[#f5dcd5] transition cursor-pointer flex items-center gap-1"
              title="이 학생 현장 재녹음"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">재녹음</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#f5f2eb] p-0.5 rounded-xl">
            <button
              disabled={!prevStudent}
              onClick={() => prevStudent && onSelectStudent(prevStudent)}
              className="p-1.5 text-[#525f5a] hover:text-[#142823] disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer rounded-lg hover:bg-white"
              title="이전 학생"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-[#7c8a84] px-1">
              {currentIndex + 1}/{allSubmissions.length}
            </span>
            <button
              disabled={!nextStudent}
              onClick={() => nextStudent && onSelectStudent(nextStudent)}
              className="p-1.5 text-[#525f5a] hover:text-[#142823] disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer rounded-lg hover:bg-white"
              title="다음 학생"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE TAB BAR (Only on screen < 1024px) */}
      <div className="lg:hidden flex items-center bg-white border-b border-[#eae5da] px-3 py-1.5 shrink-0">
        <div className="grid grid-cols-2 gap-1 w-full p-1 bg-[#ede8df] rounded-xl text-xs font-bold">
          <button
            onClick={() => setMobileViewTab('content')}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileViewTab === 'content'
                ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                : 'text-[#63706b]'
            }`}
          >
            {contentTab === 'speaking' ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>학생 발화 원문</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>제출 글 전문</span>
              </>
            )}
          </button>
          <button
            onClick={() => setMobileViewTab('rubric')}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileViewTab === 'rubric'
                ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                : 'text-[#63706b]'
            }`}
          >
            <span>루브릭 채점 ({grading.finalScore || grading.aiScore.totalScore}점)</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 p-3 sm:p-5 overflow-hidden">
        {/* Left Column (Content: Audio/STT or Writing Text) */}
        <div
          className={`lg:col-span-7 flex flex-col h-full overflow-hidden ${
            mobileViewTab === 'content' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* If combined (both), allow switching between speaking and writing tabs */}
          {submission.submissionType === 'both' && (
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <button
                onClick={() => setContentTab('speaking')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  contentTab === 'speaking'
                    ? 'bg-[#1b3831] text-[#f7f6f2] shadow-xs'
                    : 'bg-white text-[#525f5a] border border-[#eae5da]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                말하기 녹음 및 전사
              </button>
              <button
                onClick={() => setContentTab('writing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  contentTab === 'writing'
                    ? 'bg-[#1b3831] text-[#f7f6f2] shadow-xs'
                    : 'bg-white text-[#525f5a] border border-[#eae5da]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                쓰기 글 전문
              </button>
            </div>
          )}

          {/* Left Viewer Component */}
          <div className="flex-1 overflow-hidden">
            {contentTab === 'speaking' ? (
              <AudioPlayerWithTimestamps
                audioBlob={audioBlob}
                audioBase64={submission.audioBase64}
                transcript={grading.transcriptSentences || []}
                activeEvidenceRange={activeSpeakingRange}
                onSelectEvidence={(range) => {
                  setActiveSpeakingRange(range);
                }}
              />
            ) : (
              <WritingViewerWithHighlight
                sentences={grading.writingSentences || []}
                fullText={submission.writtenText}
                highlightedIndices={highlightedSentenceIndices}
                selectedEvidenceIndex={activeWritingIndex}
                onSelectSentence={(idx) => setActiveWritingIndex(idx)}
              />
            )}
          </div>
        </div>

        {/* Right Column (Rubric Grading & Teacher Feedback Panel) */}
        <div
          className={`lg:col-span-5 flex flex-col h-full overflow-hidden ${
            mobileViewTab === 'rubric' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <RubricGradingPanel
            assessment={assessment}
            submission={submission}
            grading={grading}
            onUpdateGrading={onUpdateGrading}
            onSelectSpeakingEvidence={(range) => {
              if (submission.submissionType === 'both') setContentTab('speaking');
              setActiveSpeakingRange(range);
              setMobileViewTab('content'); // switch view on mobile so teacher immediately sees playback
            }}
            onSelectWritingEvidence={(idx) => {
              if (submission.submissionType === 'both') setContentTab('writing');
              setActiveWritingIndex(idx);
              setMobileViewTab('content'); // switch view on mobile so teacher sees highlighted sentence
            }}
          />
        </div>
      </div>
    </div>
  );
};
