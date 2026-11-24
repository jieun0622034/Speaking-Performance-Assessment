import React from 'react';
import { X, Trash2, Database, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { Assessment } from '../types';
import { clearAssessmentSubmissionData, clearAllData } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssessment: Assessment | null;
  onDataCleared: () => void;
  onSeedSample: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentAssessment,
  onDataCleared,
  onSeedSample,
}) => {
  if (!isOpen) return null;

  const handleClearCurrentAssessmentData = async () => {
    if (!currentAssessment) return;
    if (
      confirm(
        `'${currentAssessment.title}' 평가의 모든 학생 음성 파일 및 제출 글 데이터를 삭제하시겠습니까? (루브릭 설정은 유지됩니다)`
      )
    ) {
      await clearAssessmentSubmissionData(currentAssessment.id);
      alert('해당 평가의 제출 데이터가 완전히 삭제되었습니다.');
      onDataCleared();
      onClose();
    }
  };

  const handleClearAll = async () => {
    if (confirm('모든 평가, 학생 제출물, 오디오 데이터가 브라우저에서 영구 삭제됩니다. 진행하시겠습니까?')) {
      await clearAllData();
      alert('모든 데이터가 초기화되었습니다.');
      onDataCleared();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">데이터 및 환경 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assessment Audio & Text Deletion */}
        {currentAssessment && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="text-xs font-bold text-slate-800">
              현재 선택된 평가: <span className="text-indigo-700">{currentAssessment.title}</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              수행평가가 종료되었거나 보관 기간이 만료된 경우, 학생의 개인정보(음성 녹음 및 제출 글)를 즉시 안전하게 파기할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={handleClearCurrentAssessmentData}
              className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              이 평가의 음성·글 데이터 삭제
            </button>
          </div>
        )}

        {/* Sample Data & Factory Reset */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onSeedSample();
              onClose();
            }}
            className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            가상 학생 4명 샘플 데이터 다시 채우기
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            전체 평가 및 제출 데이터 초기화
          </button>
        </div>

        {/* Mandatory Guidance Note */}
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center leading-relaxed">
          * 현재 프로토타입은 시연 및 검증을 위해 브라우저 로컬 저장소(localStorage/IndexedDB)에 안전하게 보관됩니다. 실제 교육 현장 배포 시에는 시도교육청 및 학교 보안 규정을 준수하는 전용 클라우드 서버 DB와 연동됩니다.
        </div>
      </div>
    </div>
  );
};
