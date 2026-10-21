import React, { useEffect, useRef } from 'react';
import { FileText, Highlighter, AlignLeft } from 'lucide-react';

interface WritingViewerWithHighlightProps {
  sentences: string[];
  fullText?: string;
  highlightedIndices?: number[];
  selectedEvidenceIndex?: number | null;
  onSelectSentence?: (index: number) => void;
}

export const WritingViewerWithHighlight: React.FC<WritingViewerWithHighlightProps> = ({
  sentences,
  fullText,
  highlightedIndices = [],
  selectedEvidenceIndex = null,
  onSelectSentence,
}) => {
  const sentenceRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (selectedEvidenceIndex !== null && sentenceRefs.current[selectedEvidenceIndex]) {
      sentenceRefs.current[selectedEvidenceIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedEvidenceIndex]);

  const displaySentences =
    sentences.length > 0
      ? sentences
      : (fullText || '')
          .split(/(?<=[.?!])\s+|\n+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#e8e6e1] shadow-2xs overflow-hidden font-sans">
      {/* Header */}
      <div className="px-4 py-3 bg-[#fcfbf9] border-b border-[#eceae5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#2c534b]" />
          <h3 className="text-sm font-semibold text-[#1b2522]">학생 제출 글 전문</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#787f7b]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#fbf0d3] border border-[#e8d5aa]"></span>
            AI 평가 근거 문장
          </span>
          <span aria-hidden="true" className="text-[#c0bcb5]">·</span>
          <span>총 {displaySentences.length}개 문장</span>
        </div>
      </div>

      {/* Sentences with highlights */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 min-h-0">
        {displaySentences.length === 0 ? (
          <div className="text-center py-16 text-[#8a918d] text-sm">제출된 글 내용이 없습니다.</div>
        ) : (
          displaySentences.map((sentence, idx) => {
            const isAIHighlighted = highlightedIndices.includes(idx);
            const isSelected = selectedEvidenceIndex === idx;

            return (
              <div
                key={idx}
                ref={(el) => {
                  sentenceRefs.current[idx] = el;
                }}
                onClick={() => onSelectSentence && onSelectSentence(idx)}
                className={`group relative p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#fef8ed] border-[#d97706] shadow-xs ring-2 ring-[#d97706]/30'
                    : isAIHighlighted
                    ? 'bg-[#faf6eb] border-[#ebd9a9] hover:bg-[#f8f1de]'
                    : 'bg-white border-[#eae7e1] hover:bg-[#faf9f7] hover:border-[#dcd8d0]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded font-medium ${
                      isSelected
                        ? 'bg-[#b45309] text-white font-semibold'
                        : isAIHighlighted
                        ? 'bg-[#f5e9c9] text-[#78350f] font-semibold'
                        : 'bg-[#f4f2ee] text-[#656d68] group-hover:bg-[#eae7e1]'
                    }`}
                  >
                    <AlignLeft className="w-3 h-3" />
                    문장 #{idx + 1}
                  </span>

                  {isAIHighlighted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8f5c1a]">
                      <Highlighter className="w-3 h-3" />
                      루브릭 근거
                    </span>
                  )}
                </div>

                <p
                  className={`text-sm leading-relaxed ${
                    isSelected
                      ? 'text-[#451a03] font-medium'
                      : isAIHighlighted
                      ? 'text-[#1b2522] font-normal'
                      : 'text-[#374151]'
                  }`}
                >
                  {sentence}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
