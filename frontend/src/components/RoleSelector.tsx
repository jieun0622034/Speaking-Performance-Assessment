import React from 'react';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Mic,
  FileText,
  ArrowRight,
  Database,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface RoleSelectorProps {
  onSelectRole: (role: 'teacher' | 'student') => void;
  onSeedSampleData: () => void;
  assessmentCount: number;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  onSelectRole,
  onSeedSampleData,
  assessmentCount,
}) => {
  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50/40 via-white to-slate-50 flex flex-col justify-between p-6 sm:p-10 font-sans">
      {/* Top Navbar */}
      <nav className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm">
            AI
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 tracking-tight">수행평가 AI 채점 도우미</div>
            <div className="text-[11px] text-slate-500 font-medium">말하기 & 쓰기 교사 승인형 평가 솔루션</div>
          </div>
        </div>

        <button
          onClick={onSeedSampleData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition"
        >
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>체험용 샘플 데이터 불러오기</span>
        </button>
      </nav>

      {/* Hero Content */}
      <main className="max-w-3xl w-full mx-auto my-auto py-10 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>믿을 수 있는 교사 승인 기반 AI 채점 워크플로우</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            말하기와 쓰기 수행평가,<br />
            <span className="text-indigo-600">AI가 초안</span>을 만들고 <span className="text-emerald-600">선생님이 승인</span>합니다.
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            학생의 녹음 음성과 작성 글에서 AI가 전사 원문과 루브릭별 근거 구간을 추출합니다. 교사는 10분 안에 첫 채점을 완료하고 신뢰도 높은 학생부 세특까지 작성할 수 있습니다.
          </p>
        </div>

        {/* 2 Main Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 max-w-2xl mx-auto">
          {/* Teacher Button Card */}
          <button
            onClick={() => onSelectRole('teacher')}
            className="group relative bg-white hover:bg-indigo-50/50 p-7 rounded-3xl border-2 border-slate-200 hover:border-indigo-600 text-left transition-all shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-indigo-600 mb-0.5">선생님 업무 공간</div>
              <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-700 transition">
                교사로 시작
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                평가 생성, 루브릭 AI 초안 설계, 학생별 근거 구간 확인, 점수 수정 및 승인, 학생부 세특 생성, 엑셀(CSV) 내보내기
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition">
              <span>교사 대시보드 열기</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Student Button Card */}
          <button
            onClick={() => onSelectRole('student')}
            className="group relative bg-white hover:bg-slate-50 p-7 rounded-3xl border-2 border-slate-200 hover:border-slate-800 text-left transition-all shadow-xs hover:shadow-md active:scale-98 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition">
                <Mic className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-500 mb-0.5">간편 제출 공간</div>
              <h3 className="text-lg font-black text-slate-900 group-hover:text-slate-950 transition">
                학생으로 제출
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                로그인 없이 6자리 코드 또는 QR 코드로 접속하여 브라우저에서 직접 음성 녹음 또는 글을 안전하게 제출합니다.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-slate-800 group-hover:translate-x-1 transition">
              <span>학생 제출 화면 열기</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* 3 Core Principles Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 max-w-2xl mx-auto text-left">
          <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              교사 최종 승인제
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              AI는 초안만 제시하며, 교사가 검토하고 승인하기 전까지는 확정되지 않습니다.
            </p>
          </div>

          <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              문장·시간 근거 링크
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              모든 점수에는 전사 텍스트 시간 구간과 문장 번호 근거가 명시적으로 연계됩니다.
            </p>
          </div>

          <div className="bg-white/80 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
              <FileText className="w-4 h-4 text-amber-600" />
              단일 평가 파이프라인
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              말하기와 쓰기 모두 동일한 직관적 흐름으로 채점 및 세특 관리가 가능합니다.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 text-xs text-slate-400 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>수행평가 AI 채점 도우미 (Performance Assessment AI Assistant)</div>
        <div className="text-[11px]">프로토타입 환경 • Google Gemini API 기반</div>
      </footer>
    </div>
  );
};
