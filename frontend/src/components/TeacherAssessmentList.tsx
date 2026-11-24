import React from 'react';
import {
  Plus,
  QrCode,
  Users,
  Mic,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  Database,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Assessment, Submission, Grading } from '../types';

interface TeacherAssessmentListProps {
  assessments: Assessment[];
  submissions: Submission[];
  gradings: Grading[];
  onSelectAssessment: (assessment: Assessment) => void;
  onCreateNew: () => void;
  onOpenQR: (assessment: Assessment) => void;
  onDeleteAssessment: (id: string) => void;
  onSeedSampleData: () => void;
}

export const TeacherAssessmentList: React.FC<TeacherAssessmentListProps> = ({
  assessments,
  submissions,
  gradings,
  onSelectAssessment,
  onCreateNew,
  onOpenQR,
  onDeleteAssessment,
  onSeedSampleData,
}) => {
  return (
    <div className="flex-1 flex flex-col h-screen bg-[#faf8f5] overflow-hidden font-sans">
      {/* Header - Clean, serene, spacious */}
      <header className="bg-white border-b border-[#eae5da] px-4 sm:px-8 py-4 sm:py-5 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#142823] tracking-tight">
              수행평가 보관함
            </h1>
            <p className="text-xs text-[#7c8a84] mt-0.5 hidden sm:block">
              학생을 1:1로 불러 직접 녹음하고 AI 초안을 검토·승인하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSeedSampleData}
              className="px-3 py-2 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-semibold rounded-xl transition cursor-pointer hidden sm:flex items-center gap-1.5"
              title="가상 학생 4명 샘플 데이터 생성"
            >
              <Database className="w-3.5 h-3.5" />
              <span>샘플 불러오기</span>
            </button>

            <button
              onClick={onCreateNew}
              className="px-4 py-2 bg-[#1b3831] hover:bg-[#142b26] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
              <span>새 평가 만들기</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
        <div className="max-w-6xl mx-auto">
          {assessments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#eae5da] p-10 sm:p-12 text-center max-w-md mx-auto mt-8 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf1ed] text-[#1b3831] flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#142823]">등록된 수행평가가 없습니다</h3>
                <p className="text-xs text-[#63706b] mt-1.5 leading-relaxed">
                  새 평가를 만들거나, 샘플 데이터를 불러와 1:1 대면 채점 흐름을 바로 체험해보세요.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={onSeedSampleData}
                  className="px-4 py-2 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  샘플 데이터 생성
                </button>
                <button
                  onClick={onCreateNew}
                  className="px-4 py-2 bg-[#1b3831] hover:bg-[#142b26] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  새 평가 만들기
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {assessments.map((assessment) => {
                const asmSubmissions = submissions.filter((s) => s.assessmentId === assessment.id);
                const asmGradings = gradings.filter((g) => g.assessmentId === assessment.id);
                const approvedCount = asmGradings.filter((g) => g.status === 'teacher_approved').length;
                const totalCount = asmSubmissions.length;
                const percent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

                return (
                  <div
                    key={assessment.id}
                    onClick={() => onSelectAssessment(assessment)}
                    className="bg-white rounded-2xl border border-[#eae5da] p-5 shadow-2xs hover:shadow-md hover:border-[#1b3831]/40 cursor-pointer transition flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      {/* Quiet Unboxed Metadata */}
                      <div className="flex items-center justify-between text-xs text-[#7c8a84]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#1b3831]">{assessment.subject}</span>
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

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onOpenQR(assessment)}
                            className="p-1 text-[#8b9893] hover:text-[#142823] rounded-lg transition"
                            title="제출 코드 보기"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('이 평가를 삭제하시겠습니까? 관련된 학생 채점 데이터도 삭제됩니다.')) {
                                onDeleteAssessment(assessment.id);
                              }
                            }}
                            className="p-1 text-[#8b9893] hover:text-[#b4532b] rounded-lg transition"
                            title="평가 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-[#142823] group-hover:text-[#1b3831] transition line-clamp-2 leading-snug">
                        {assessment.title}
                      </h3>

                      {/* Prompt */}
                      <p className="text-xs text-[#63706b] line-clamp-2 leading-relaxed">
                        {assessment.prompt}
                      </p>
                    </div>

                    {/* Footer: Progress line & Arrow */}
                    <div className="mt-5 pt-3 border-t border-[#f2efe9] flex items-center justify-between">
                      <div className="text-xs text-[#63706b]">
                        <span>총 {totalCount}명 중 </span>
                        <strong className="text-[#1b3831] font-bold">{approvedCount}명 완료</strong>
                        <span className="text-[11px] text-[#8b9893] ml-1">({percent}%)</span>
                      </div>

                      <span className="text-xs font-bold text-[#1b3831] flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        <span>채점하기</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
