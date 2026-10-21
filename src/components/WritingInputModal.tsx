import React, { useState } from 'react';
import { X, FileText, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Assessment } from '../types';

interface WritingInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  student: { studentNumber: string; studentName: string };
  initialText?: string;
  onSubmitText: (text: string) => Promise<void>;
}

export const WritingInputModal: React.FC<WritingInputModalProps> = ({
  isOpen,
  onClose,
  assessment,
  student,
  initialText = '',
  onSubmitText,
}) => {
  const [text, setText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const charCount = text.replace(/\s/g, '').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitText(text.trim());
      onClose();
    } catch (err) {
      console.error('Submit writing error', err);
      alert('글 저장 및 AI 채점 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#142823]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#faf8f5] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-[#eae5da] space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eae5da] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#b45309] text-white flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-[#fdf7ed] text-[#8f5c1a] px-2 py-0.5 rounded-md border border-[#f3ddb3]">
                  {student.studentNumber}번
                </span>
                <h3 className="text-base font-bold text-[#142823]">{student.studentName} 학생</h3>
              </div>
              <div className="text-xs text-[#63706b] font-medium mt-0.5">
                학생 작성 글 직접 입력 및 AI 채점
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#7c8a84] hover:text-[#1c2623] rounded-full hover:bg-[#f5f2eb] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt reminder */}
        <div className="p-3 bg-white border border-[#eae5da] rounded-2xl text-xs text-[#45504c]">
          <span className="font-bold text-[#142823] block mb-0.5">과제 안내문:</span>
          <p className="line-clamp-2 leading-relaxed text-[#525f5a]">{assessment.prompt}</p>
        </div>

        {/* Textarea Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#45504c]">학생 제출 글 본문</label>
            <span
              className={`font-mono font-bold ${
                assessment.charLimitRange &&
                (charCount < assessment.charLimitRange.min || charCount > assessment.charLimitRange.max)
                  ? 'text-[#b4532b]'
                  : 'text-[#1b3831]'
              }`}
            >
              {charCount}자 (공백 제외)
            </span>
          </div>

          <textarea
            rows={8}
            required
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="학생이 작성한 글을 직접 입력하거나 붙여넣으세요..."
            className="w-full text-xs p-3.5 bg-white border border-[#d8d3c7] rounded-2xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden leading-relaxed"
          />

          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-bold rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="px-5 py-2.5 bg-[#1b3831] hover:bg-[#142b26] disabled:opacity-40 text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#a8d4c5]" />
              <span>{isSubmitting ? 'AI 채점 중...' : '글 저장 및 AI 채점 시작'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
