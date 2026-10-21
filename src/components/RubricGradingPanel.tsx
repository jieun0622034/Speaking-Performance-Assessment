import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Volume2,
  FileText,
  Copy,
  Check,
  Undo2,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Assessment, Submission, Grading } from '../types';

interface RubricGradingPanelProps {
  assessment: Assessment;
  submission: Submission;
  grading: Grading;
  onUpdateGrading: (updatedGrading: Grading) => void;
  onSelectSpeakingEvidence?: (range: { start_sec: number; end_sec: number }) => void;
  onSelectWritingEvidence?: (sentenceIndex: number) => void;
}

export const RubricGradingPanel: React.FC<RubricGradingPanelProps> = ({
  assessment,
  submission,
  grading,
  onUpdateGrading,
  onSelectSpeakingEvidence,
  onSelectWritingEvidence,
}) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'record'>('rubric');

  const [teacherScores, setTeacherScores] = useState<{ [criterionId: string]: number }>(() => {
    const map: { [key: string]: number } = {};
    assessment.criteria.forEach((c) => {
      const existing = grading.teacherScore?.criteriaScores.find((ts) => ts.criterionId === c.id);
      if (existing) {
        map[c.id] = existing.score;
      } else {
        const aiScore = grading.aiScore.criteriaScores.find((as) => as.criterionId === c.id);
        map[c.id] = aiScore ? aiScore.score : c.levels.high.score;
      }
    });
    return map;
  });

  const [teacherComments, setTeacherComments] = useState<{ [criterionId: string]: string }>(() => {
    const map: { [key: string]: string } = {};
    assessment.criteria.forEach((c) => {
      const existing = grading.teacherScore?.criteriaScores.find((ts) => ts.criterionId === c.id);
      map[c.id] = existing ? existing.comment : '';
    });
    return map;
  });

  // School record (세특) state
  const [recordLength, setRecordLength] = useState(300);
  const [isGeneratingRecord, setIsGeneratingRecord] = useState(false);
  const [schoolRecordText, setSchoolRecordText] = useState(grading.schoolRecordDraft || '');
  const [copiedRecord, setCopiedRecord] = useState(false);

  const isApproved = grading.status === 'teacher_approved';

  const currentTotal = assessment.criteria.reduce((sum, c) => {
    const score = teacherScores[c.id] ?? 0;
    return sum + score;
  }, 0);

  const maxTotalScore = assessment.criteria.reduce((sum, c) => sum + c.maxScore, 0);

  const handleScoreChange = (criterionId: string, newScore: number) => {
    setTeacherScores((prev) => ({
      ...prev,
      [criterionId]: newScore,
    }));
  };

  const handleCommentChange = (criterionId: string, comment: string) => {
    setTeacherComments((prev) => ({
      ...prev,
      [criterionId]: comment,
    }));
  };

  // Final Teacher Approval
  const handleApprove = () => {
    const criteriaScoresList = assessment.criteria.map((c) => ({
      criterionId: c.id,
      score: teacherScores[c.id] ?? c.levels.high.score,
      comment: teacherComments[c.id] || '',
    }));

    const finalScore = currentTotal;
    const now = new Date().toISOString();

    const newChangeLog = {
      timestamp: now,
      type: 'approved' as const,
      summary: `교사가 총점 ${finalScore.toFixed(1)}점으로 최종 승인 확정`,
      actor: '교사',
    };

    const updated: Grading = {
      ...grading,
      status: 'teacher_approved',
      finalScore,
      approvedAt: now,
      teacherScore: {
        totalScore: finalScore,
        criteriaScores: criteriaScoresList,
      },
      schoolRecordDraft: schoolRecordText,
      changeLogs: [newChangeLog, ...(grading.changeLogs || [])],
    };

    onUpdateGrading(updated);
  };

  // Cancel Approval to Re-edit
  const handleCancelApproval = () => {
    const now = new Date().toISOString();
    const newChangeLog = {
      timestamp: now,
      type: 'approval_cancelled' as const,
      summary: '승인 취소 후 점수 수정 상태로 복원',
      actor: '교사',
    };

    const updated: Grading = {
      ...grading,
      status: 'ai_graded',
      finalScore: undefined,
      approvedAt: undefined,
      changeLogs: [newChangeLog, ...(grading.changeLogs || [])],
    };

    onUpdateGrading(updated);
  };

  // Generate School Record (세특) draft
  const handleGenerateSchoolRecord = async () => {
    setIsGeneratingRecord(true);
    try {
      let contentSummary = '';
      if (grading.transcriptSentences && grading.transcriptSentences.length > 0) {
        contentSummary = grading.transcriptSentences.map((s) => s.text).join(' ');
      } else if (submission.writtenText) {
        contentSummary = submission.writtenText;
      }

      const scoresSummary = assessment.criteria
        .map((c) => `${c.name}: ${teacherScores[c.id] || c.levels.high.score}/${c.maxScore}점`)
        .join(', ');

      const res = await fetch('/api/record/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: submission.studentName,
          subject: assessment.subject,
          assessmentTitle: assessment.title,
          achievementStandard: assessment.achievementStandard,
          contentSummary,
          scoresSummary,
          targetLength: recordLength,
        }),
      });

      const data = await res.json();
      if (data.draft) {
        setSchoolRecordText(data.draft);
        const updated: Grading = {
          ...grading,
          schoolRecordDraft: data.draft,
        };
        onUpdateGrading(updated);
      }
    } catch (e) {
      console.error('Failed to generate record draft', e);
    } finally {
      setIsGeneratingRecord(false);
    }
  };

  const handleCopyRecord = () => {
    if (!schoolRecordText) return;
    navigator.clipboard.writeText(schoolRecordText);
    setCopiedRecord(true);
    setTimeout(() => setCopiedRecord(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#eae5da] shadow-2xs overflow-hidden font-sans">
      {/* Top Bar: Sub-Tabs [루브릭 채점] vs [세특 및 지표] */}
      <div className="p-2.5 bg-[#faf8f5] border-b border-[#eae5da] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 p-0.5 bg-[#ede8df] rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('rubric')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'rubric'
                ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                : 'text-[#63706b] hover:text-[#1c2623]'
            }`}
          >
            루브릭 채점 ({currentTotal.toFixed(1)}점)
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'record'
                ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                : 'text-[#63706b] hover:text-[#1c2623]'
            }`}
          >
            세특 및 지표
          </button>
        </div>

        {/* Quiet Approval Status */}
        <div className="text-xs">
          {isApproved ? (
            <span className="text-[#1b3831] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 승인 확정됨
            </span>
          ) : (
            <span className="text-[#8f5c1a] font-medium">AI 초안 검토 중</span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {activeTab === 'rubric' ? (
          /* TAB 1: RUBRIC CRITERIA */
          <div className="space-y-3.5">
            {grading.aiScore.needsReview && (
              <div className="p-3 bg-[#fdf3f0] border border-[#f5dcd5] rounded-xl text-xs text-[#a14022] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#b44826] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">확인 필요 대상: </span>
                  {grading.aiScore.needsReviewReason || grading.aiScore.confidenceReason}
                </div>
              </div>
            )}

            {assessment.criteria.map((criterion, idx) => {
              const aiGrading = grading.aiScore.criteriaScores.find((c) => c.criterionId === criterion.id);
              const currentScore = teacherScores[criterion.id] ?? (aiGrading?.score || 0);

              return (
                <div
                  key={criterion.id}
                  className="p-3.5 bg-[#faf8f5] border border-[#eae5da] rounded-2xl space-y-2.5 transition"
                >
                  {/* Criterion Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#142823] truncate">
                        {idx + 1}. {criterion.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[#7c8a84]">점수:</span>
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        max={criterion.maxScore}
                        disabled={isApproved}
                        value={currentScore}
                        onChange={(e) =>
                          handleScoreChange(criterion.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-12 px-1 py-0.5 bg-white border border-[#d8d3c7] rounded-lg text-center font-mono font-bold text-xs text-[#1b3831] disabled:bg-[#f2efe9]"
                      />
                      <span className="text-xs text-[#8b9893] font-mono">/ {criterion.maxScore}</span>
                    </div>
                  </div>

                  {/* 3-Level Quick Buttons (상 / 중 / 하) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['high', 'mid', 'low'] as const).map((lvlKey) => {
                      const lvl = criterion.levels[lvlKey];
                      const isLevelActive = Math.abs(currentScore - lvl.score) < 0.25;
                      const isAiDraft = aiGrading?.level === lvl.label;

                      return (
                        <button
                          key={lvlKey}
                          type="button"
                          disabled={isApproved}
                          onClick={() => handleScoreChange(criterion.id, lvl.score)}
                          className={`p-2 rounded-xl text-left border transition text-xs cursor-pointer ${
                            isLevelActive
                              ? 'bg-white border-[#1b3831] shadow-2xs ring-1 ring-[#1b3831]'
                              : 'bg-white/60 border-[#eae5da] hover:bg-white text-[#525f5a]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-[#142823]">
                              {lvl.label} ({lvl.score}점)
                            </span>
                            {isAiDraft && (
                              <span className="text-[10px] text-[#1b3831] font-semibold">AI추천</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#7c8a84] line-clamp-2 leading-tight">
                            {lvl.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* AI Reasoning & Evidence Jump Link */}
                  <div className="text-[11px] text-[#525f5a] leading-relaxed pt-1 flex flex-col gap-1">
                    <div>
                      <span className="font-semibold text-[#142823]">AI 초안 판단: </span>
                      {aiGrading?.reason || '분석 중'}
                    </div>

                    {/* Evidence Quick Jumps */}
                    {aiGrading?.evidenceSpeaking && aiGrading.evidenceSpeaking.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[#7c8a84]">발화 근거:</span>
                        {aiGrading.evidenceSpeaking.map((ev, evIdx) => (
                          <button
                            key={evIdx}
                            type="button"
                            onClick={() => onSelectSpeakingEvidence && onSelectSpeakingEvidence(ev)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#1b3831] underline hover:text-[#142b26] cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3 text-[#1b3831]" />
                            {Math.floor(ev.start_sec / 60)}:{(ev.start_sec % 60).toString().padStart(2, '0')} 구간 재생
                          </button>
                        ))}
                      </div>
                    )}

                    {aiGrading?.evidenceWriting && aiGrading.evidenceWriting.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[#7c8a84]">글 근거:</span>
                        {aiGrading.evidenceWriting.map((ev, evIdx) => (
                          <button
                            key={evIdx}
                            type="button"
                            onClick={() => onSelectWritingEvidence && onSelectWritingEvidence(ev.sentence_index)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8f5c1a] underline hover:text-[#b45309] cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            문장 #{ev.sentence_index + 1} 이동
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TAB 2: SCHOOL RECORD (세특) & METRICS */
          <div className="space-y-4">
            {/* School Record Generator */}
            <div className="p-4 bg-[#faf8f5] border border-[#eae5da] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#142823]">생활기록부 교과 세특 초안</h4>
                  <p className="text-[11px] text-[#7c8a84]">
                    실제 발화/글 내용과 점수를 바탕으로 '~함' 서술체로 작성됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateSchoolRecord}
                  disabled={isGeneratingRecord}
                  className="px-3 py-1.5 bg-[#1b3831] hover:bg-[#142b26] disabled:opacity-40 text-[#f7f6f2] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#a8d4c5]" />
                  <span>{isGeneratingRecord ? '작성 중...' : '세특 생성'}</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={5}
                  value={schoolRecordText}
                  onChange={(e) => setSchoolRecordText(e.target.value)}
                  placeholder="[세특 생성] 버튼을 누르면 AI가 학생의 실제 발표/글에서 근거를 뽑아 학생부 서술체 초안을 만듭니다."
                  className="w-full text-xs p-3 bg-white border border-[#d8d3c7] rounded-xl text-[#142823] leading-relaxed focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden resize-none"
                />
                {schoolRecordText && (
                  <button
                    type="button"
                    onClick={handleCopyRecord}
                    className="absolute right-2 bottom-2 px-2.5 py-1 bg-white border border-[#d8d3c7] hover:bg-[#faf8f5] text-[11px] font-bold text-[#142823] rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedRecord ? (
                      <>
                        <Check className="w-3 h-3 text-[#1b3831]" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#7c8a84]" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {schoolRecordText && (
                <div className="text-right text-[11px] font-mono text-[#7c8a84]">
                  {schoolRecordText.length}자 (공백 포함)
                </div>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="p-3.5 bg-[#faf8f5] border border-[#eae5da] rounded-2xl text-xs space-y-2">
              <div className="font-bold text-[#142823] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#7c8a84]" />
                <span>분석 보조 지표 (참고용)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#525f5a]">
                {grading.metrics?.speaking && (
                  <div>
                    <div>발화 시간: <strong className="font-mono text-[#142823]">{grading.metrics.speaking.durationSec}초</strong></div>
                    <div>발화 속도: <strong className="font-mono text-[#142823]">{grading.metrics.speaking.wpm} WPM</strong></div>
                    <div>군더더기어: <strong className="font-mono text-[#142823]">{grading.metrics.speaking.fillersCount}회</strong></div>
                  </div>
                )}
                {grading.metrics?.writing && (
                  <div>
                    <div>글자 수: <strong className="font-mono text-[#142823]">{grading.metrics.writing.charCount}자</strong></div>
                    <div>문장 수: <strong className="font-mono text-[#142823]">{grading.metrics.writing.sentenceCount}문장</strong></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating / Sticky Approval Footer Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-[#eae5da] shrink-0 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-[#7c8a84]">채점 합계</div>
          <div className="text-base sm:text-lg font-black font-mono text-[#142823]">
            {currentTotal.toFixed(1)}{' '}
            <span className="text-xs font-normal text-[#8b9893]">/ {maxTotalScore}점</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <button
              type="button"
              onClick={handleCancelApproval}
              className="px-3.5 py-2.5 bg-white border border-[#d8d3c7] hover:bg-[#faf8f5] text-[#525f5a] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>승인 취소</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApprove}
              className="px-5 py-2.5 bg-[#1b3831] hover:bg-[#142b26] active:scale-95 text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-[#a8d4c5]" />
              <span>교사 최종 승인 ({currentTotal.toFixed(1)}점 확정)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
