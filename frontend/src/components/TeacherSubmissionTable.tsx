import React, { useState } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  Sparkles,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Clock,
  Mic,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  Search,
  UserPlus,
  Radio,
  MoreVertical,
} from 'lucide-react';
import { Assessment, Submission, Grading } from '../types';
import { exportScoresToCSV } from '../utils/csv';

interface TeacherSubmissionTableProps {
  assessment: Assessment;
  submissions: Submission[];
  gradings: Grading[];
  onBack: () => void;
  onOpenGradingDetail: (submission: Submission) => void;
  onBatchAIGrade: () => Promise<void>;
  isBatchGrading: boolean;
  batchProgress: { current: number; total: number; studentName?: string };
  onShowQRModal: () => void;
  onOpenOnSiteRecorder: (student: { studentNumber: string; studentName: string; submissionId?: string }) => void;
  onOpenWritingInput: (student: { studentNumber: string; studentName: string; submissionId?: string; initialText?: string }) => void;
  onOpenRosterModal: () => void;
}

export const TeacherSubmissionTable: React.FC<TeacherSubmissionTableProps> = ({
  assessment,
  submissions,
  gradings,
  onBack,
  onOpenGradingDetail,
  onBatchAIGrade,
  isBatchGrading,
  batchProgress,
  onShowQRModal,
  onOpenOnSiteRecorder,
  onOpenWritingInput,
  onOpenRosterModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'draft' | 'approved' | 'review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const totalSubmissions = submissions.length;
  const approvedCount = gradings.filter((g) => g.status === 'teacher_approved').length;
  const aiGradedCount = gradings.filter((g) => g.status === 'ai_graded').length;
  const needsReviewCount = gradings.filter((g) => g.aiScore?.needsReview).length;
  const pendingCount = submissions.filter((s) => {
    const g = gradings.find((gr) => gr.submissionId === s.id);
    return !g || g.status === 'pending' || (!s.audioBlobId && !s.audioBase64 && !s.writtenText);
  }).length;

  const filteredSubmissions = submissions.filter((sub) => {
    const grading = gradings.find((g) => g.submissionId === sub.id);
    const hasRecording = !!sub.audioBlobId || !!sub.audioBase64 || !!sub.writtenText;

    if (searchQuery.trim()) {
      const matchName = sub.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchNum = sub.studentNumber.includes(searchQuery);
      if (!matchName && !matchNum) return false;
    }

    if (filterStatus === 'approved') return grading?.status === 'teacher_approved';
    if (filterStatus === 'draft') return grading?.status === 'ai_graded';
    if (filterStatus === 'pending') return !hasRecording || grading?.status === 'pending';
    if (filterStatus === 'review') return !!grading?.aiScore?.needsReview;

    return true;
  });

  // Find next student who hasn't been recorded or approved
  const nextStudentToRecord = submissions.find((s) => {
    return !s.audioBlobId && !s.audioBase64 && !s.writtenText;
  }) || submissions.find((s) => {
    const g = gradings.find((gr) => gr.submissionId === s.id);
    return !g || g.status !== 'teacher_approved';
  });

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#faf8f5] overflow-hidden font-sans">
      {/* Top Header - Compact, Serene & Clean on both Mobile & PC */}
      <header className="bg-white border-b border-[#eae5da] px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-[#525f5a] hover:text-[#142823] hover:bg-[#f5f2eb] rounded-xl transition cursor-pointer"
              title="평가 목록으로"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#7c8a84]">
                <span>{assessment.subject}</span>
                <span aria-hidden="true">·</span>
                <span>{assessment.grade}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {assessment.submissionType === 'speaking'
                    ? '말하기'
                    : assessment.submissionType === 'writing'
                    ? '쓰기'
                    : '말하기+쓰기'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#142823] truncate tracking-tight">
                {assessment.title}
              </h1>
            </div>
          </div>

          {/* Desktop/Tablet Action Icons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onOpenRosterModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>명렬표</span>
            </button>
            <button
              onClick={onShowQRModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>제출코드</span>
            </button>
            <button
              onClick={() => exportScoresToCSV(assessment, submissions, gradings)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV 내보내기</span>
            </button>
            <button
              onClick={onBatchAIGrade}
              disabled={isBatchGrading || submissions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b3831] hover:bg-[#142b26] disabled:opacity-40 text-[#f7f6f2] text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#a8d4c5]" />
              <span>{isBatchGrading ? 'AI 채점 중...' : '전체 채점'}</span>
            </button>
          </div>

          {/* Mobile Quick Menu Toggle */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-[#525f5a] hover:text-[#142823] rounded-xl hover:bg-[#f5f2eb] transition cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#eae5da] rounded-2xl shadow-xl py-2 w-48 z-30 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onOpenRosterModal();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#142823] hover:bg-[#faf8f5] flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-[#7c8a84]" />
                  <span>학급 명렬표 관리</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onShowQRModal();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#142823] hover:bg-[#faf8f5] flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-[#7c8a84]" />
                  <span>제출 코드 / QR</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    exportScoresToCSV(assessment, submissions, gradings);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#142823] hover:bg-[#faf8f5] flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#7c8a84]" />
                  <span>엑셀(CSV) 다운로드</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onBatchAIGrade();
                  }}
                  disabled={isBatchGrading}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#1b3831] font-bold hover:bg-[#faf8f5] flex items-center gap-2 border-t border-[#f0ece3]"
                >
                  <Sparkles className="w-4 h-4 text-[#1b3831]" />
                  <span>전체 AI 채점 실행</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* PRIMARY CALLOUT: 1:1 On-Site Recording Banner */}
          {nextStudentToRecord && (
            <div className="bg-white border border-[#eae5da] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#eaf1ed] text-[#1b3831] flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#1b3831]">
                    다음 1:1 대면 녹음 차례
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#142823]">
                    {nextStudentToRecord.studentNumber}번 {nextStudentToRecord.studentName} 학생
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {assessment.submissionType !== 'writing' && (
                  <button
                    onClick={() => onOpenOnSiteRecorder(nextStudentToRecord)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-[#1b3831] hover:bg-[#142b26] active:scale-95 text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-[#a8d4c5] animate-pulse" />
                    <span>지금 1:1 녹음 시작</span>
                  </button>
                )}

                {assessment.submissionType !== 'speaking' && (
                  <button
                    onClick={() =>
                      onOpenWritingInput({
                        ...nextStudentToRecord,
                        initialText: nextStudentToRecord.writtenText,
                      })
                    }
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-[#fdf7ed] hover:bg-[#faeed6] text-[#8f5c1a] border border-[#f3ddb3] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#b45309]" />
                    <span>글 작성 입력</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Clean Progress & Quiet Metrics Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#63706b] px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>총 {totalSubmissions}명</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#1b3831] font-semibold">승인 완료 {approvedCount}명</span>
              <span aria-hidden="true">·</span>
              <span>AI 초안 {aiGradedCount}명</span>
              {pendingCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8f5c1a]">대기 {pendingCount}명</span>
                </>
              )}
              {needsReviewCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#b4532b] font-semibold">확인 필요 {needsReviewCount}명</span>
                </>
              )}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#8b9893] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="번호 또는 이름 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Interactive Filter Tabs - Clean Segmented Bar */}
          <div className="flex items-center gap-1 p-1 bg-[#ede8df] rounded-xl text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                  : 'text-[#63706b] hover:text-[#1c2623]'
              }`}
            >
              전체 ({totalSubmissions})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                  : 'text-[#63706b] hover:text-[#1c2623]'
              }`}
            >
              녹음 대기 ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('draft')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                filterStatus === 'draft'
                  ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                  : 'text-[#63706b] hover:text-[#1c2623]'
              }`}
            >
              AI 채점됨 ({aiGradedCount})
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-white text-[#1b3831] shadow-2xs font-bold'
                  : 'text-[#63706b] hover:text-[#1c2623]'
              }`}
            >
              승인 완료 ({approvedCount})
            </button>
            {needsReviewCount > 0 && (
              <button
                onClick={() => setFilterStatus('review')}
                className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                  filterStatus === 'review'
                    ? 'bg-white text-[#b4532b] shadow-2xs font-bold'
                    : 'text-[#b4532b] hover:text-[#8f3a19]'
                }`}
              >
                확인 필요 ({needsReviewCount})
              </button>
            )}
          </div>

          {/* DESKTOP/TABLET TABLE VIEW (Hidden on Mobile) */}
          <div className="hidden md:block bg-white border border-[#eae5da] rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#eae5da] bg-[#faf8f5] text-[#7c8a84] font-semibold">
                  <th className="py-3 px-4 w-16">번호</th>
                  <th className="py-3 px-4 w-32">학생 이름</th>
                  <th className="py-3 px-4 w-32">상태</th>
                  <th className="py-3 px-4 text-right w-24">AI 초안</th>
                  <th className="py-3 px-4 text-right w-28">교사 최종</th>
                  <th className="py-3 px-4">확인 필요</th>
                  <th className="py-3 px-4 text-right w-36">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2efe9]">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8b9893]">
                      해당 조건의 학생이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => {
                    const grading = gradings.find((g) => g.submissionId === sub.id);
                    const isApproved = grading?.status === 'teacher_approved';
                    const isAiGraded = grading?.status === 'ai_graded';
                    const hasData = !!sub.audioBlobId || !!sub.audioBase64 || !!sub.writtenText;
                    const needsReview = grading?.aiScore?.needsReview;

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => onOpenGradingDetail(sub)}
                        className="hover:bg-[#faf8f5] cursor-pointer transition"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#7c8a84]">
                          {sub.studentNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#142823]">
                          {sub.studentName}
                        </td>
                        <td className="py-3 px-4">
                          {isApproved ? (
                            <span className="text-[#1b3831] font-bold">승인 완료</span>
                          ) : isAiGraded ? (
                            <span className="text-[#525f5a]">AI 채점됨</span>
                          ) : (
                            <span className="text-[#9ea8a4]">녹음 대기</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#525f5a]">
                          {grading?.aiScore?.totalScore !== undefined
                            ? `${grading.aiScore.totalScore.toFixed(1)}점`
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {isApproved ? (
                            <span className="text-[#1b3831]">
                              {(grading?.finalScore ?? grading?.teacherScore?.totalScore ?? 0).toFixed(1)}점
                            </span>
                          ) : (
                            <span className="text-[#9ea8a4] font-normal text-[11px]">미승인</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {needsReview ? (
                            <span className="text-[#b4532b] text-[11px] font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[180px]">
                                {grading?.aiScore?.needsReviewReason || '확인 필요'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[#b5ad9e] text-[11px]">정상</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {assessment.submissionType !== 'writing' && (
                              <button
                                onClick={() => onOpenOnSiteRecorder(sub)}
                                className="px-2.5 py-1 text-[11px] font-bold text-[#1b3831] bg-[#eaf1ed] hover:bg-[#ddebe4] rounded-lg transition cursor-pointer"
                                title="1:1 대면 녹음"
                              >
                                {hasData ? '재녹음' : '대면 녹음'}
                              </button>
                            )}
                            <button
                              onClick={() => onOpenGradingDetail(sub)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#525f5a] hover:bg-[#f5f2eb] rounded-lg transition cursor-pointer"
                            >
                              {isApproved ? '검토' : '채점'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS VIEW - Ultra Clean & Spacious on Smartphone */}
          <div className="block md:hidden space-y-2.5 pb-6">
            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center text-[#8b9893] bg-white rounded-2xl border border-[#eae5da] text-xs">
                해당 조건의 학생이 없습니다.
              </div>
            ) : (
              filteredSubmissions.map((sub) => {
                const grading = gradings.find((g) => g.submissionId === sub.id);
                const isApproved = grading?.status === 'teacher_approved';
                const isAiGraded = grading?.status === 'ai_graded';
                const hasData = !!sub.audioBlobId || !!sub.audioBase64 || !!sub.writtenText;
                const needsReview = grading?.aiScore?.needsReview;

                return (
                  <div
                    key={sub.id}
                    onClick={() => onOpenGradingDetail(sub)}
                    className="p-3.5 bg-white rounded-2xl border border-[#eae5da] shadow-2xs space-y-2.5 active:bg-[#faf8f5] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-[#f5f2eb] text-[#142823] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {sub.studentNumber}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-[#142823] leading-none">
                            {sub.studentName}
                          </div>
                          <div className="text-[11px] text-[#7c8a84] mt-1">
                            {isApproved ? (
                              <span className="text-[#1b3831] font-bold">
                                승인 완료 ({(grading?.finalScore ?? 0).toFixed(1)}점)
                              </span>
                            ) : isAiGraded ? (
                              <span>
                                AI 초안 ({grading?.aiScore?.totalScore?.toFixed(1)}점)
                              </span>
                            ) : (
                              <span>녹음 대기 중</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Quick Action */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {assessment.submissionType !== 'writing' && !hasData ? (
                          <button
                            onClick={() => onOpenOnSiteRecorder(sub)}
                            className="px-3.5 py-2 bg-[#1b3831] text-[#f7f6f2] text-xs font-bold rounded-xl flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>녹음</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenGradingDetail(sub)}
                            className="px-3.5 py-2 bg-[#f5f2eb] text-[#142823] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isApproved ? '검토' : '채점'}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#7c8a84]" />
                          </button>
                        )}
                      </div>
                    </div>

                    {needsReview && (
                      <div className="text-[11px] text-[#b4532b] bg-[#fdf3f0] p-2 rounded-xl flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {grading?.aiScore?.needsReviewReason || '신뢰도 또는 점수 경계치 확인 필요'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
