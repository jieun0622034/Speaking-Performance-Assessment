import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Mic,
  FileText,
  Layers,
  Check,
} from 'lucide-react';
import { Assessment, SubmissionType, GradingMode, RubricCriterion } from '../types';

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assessment: Assessment) => void;
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('영어');
  const [grade, setGrade] = useState('중학교 2학년');
  const [achievementStandard, setAchievementStandard] = useState(
    '[09영03-04] 친숙한 일반적 주제에 관하여 자신의 의견이나 생각을 간단한 문장으로 말하거나 쓸 수 있다.'
  );
  const [prompt, setPrompt] = useState(
    '기후 변화의 원인과 우리가 일상에서 실천할 수 있는 구체적인 환경 보호 행동을 이유와 함께 논리적으로 서술(발표)하세요.'
  );
  const [submissionType, setSubmissionType] = useState<SubmissionType>('speaking');
  const [timeLimitSec, setTimeLimitSec] = useState(90);
  const [charMin, setCharMin] = useState(150);
  const [charMax, setCharMax] = useState(400);
  const [gradingMode, setGradingMode] = useState<GradingMode>('content');

  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    {
      id: 'crit-1',
      name: '과제 수행 및 내용 충실성',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '과제 요구사항을 모두 충족하고 주제와 관련된 풍부하고 구체적인 내용을 제시함.', score: 5 },
        mid: { label: '중', desc: '과제 요구사항을 대체로 충족하나 일부 구체성이 부족함.', score: 3.5 },
        low: { label: '하', desc: '과제 요구사항을 충족하지 못하고 단편적인 내용에 그침.', score: 2 },
      },
    },
    {
      id: 'crit-2',
      name: '구성 및 논리적 흐름',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '도입, 본론, 결론의 연결이 자연스럽고 논리적으로 전개함.', score: 5 },
        mid: { label: '중', desc: '기본적인 전개 구조를 갖추었으나 문장 간 연결이 다소 불연속적임.', score: 3.5 },
        low: { label: '하', desc: '문장 간 연결성이 부족하고 논리적 비약이 심함.', score: 2 },
      },
    },
    {
      id: 'crit-3',
      name: '어휘 및 표현 적절성',
      target: 'both',
      maxScore: 5,
      levels: {
        high: { label: '상', desc: '주제에 부합하는 다양한 어휘와 적절한 문장 형식을 능숙하게 구사함.', score: 5 },
        mid: { label: '중', desc: '기본적인 일상 어휘를 사용하며 의미 전달에는 지장이 없음.', score: 3.5 },
        low: { label: '하', desc: '어휘 및 표현의 오류로 인해 의미 전달이 어려움.', score: 2 },
      },
    },
  ]);

  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Handle AI Rubric Generation
  const handleGenerateRubricWithAI = async () => {
    setIsGeneratingRubric(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/rubric/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || '수행평가',
          subject,
          grade,
          achievementStandard,
          prompt,
          submissionType,
          gradingMode,
        }),
      });

      const data = await res.json();
      if (data.criteria && data.criteria.length > 0) {
        setCriteria(data.criteria);
      } else {
        throw new Error(data.error || '루브릭 생성 응답이 올바르지 않습니다.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '루브릭 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const handleAddCriterion = () => {
    const newId = `crit-${Date.now()}`;
    setCriteria([
      ...criteria,
      {
        id: newId,
        name: '새 평가 항목',
        target: submissionType === 'both' ? 'both' : submissionType,
        maxScore: 5,
        levels: {
          high: { label: '상', desc: '우수한 수준으로 달성함.', score: 5 },
          mid: { label: '중', desc: '보통 수준으로 달성함.', score: 3.5 },
          low: { label: '하', desc: '노력이 필요한 수준임.', score: 2 },
        },
      },
    ]);
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) {
      alert('최소 1개 이상의 루브릭 기준이 필요합니다.');
      return;
    }
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('평가 이름을 입력해 주세요.');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newAssessment: Assessment = {
      id: `asm-${Date.now()}`,
      code,
      title: title.trim(),
      subject,
      grade,
      achievementStandard: achievementStandard.trim(),
      prompt: prompt.trim(),
      submissionType,
      timeLimitSec: submissionType !== 'writing' ? timeLimitSec : undefined,
      charLimitRange: submissionType !== 'speaking' ? { min: charMin, max: charMax } : undefined,
      gradingMode,
      criteria,
      createdAt: new Date().toISOString(),
    };

    onSave(newAssessment);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#142823]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#faf8f5] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#eae5da] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#eae5da] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#142823]">새 수행평가 만들기</h2>
            <p className="text-xs text-[#63706b] mt-0.5">
              기본 정보를 입력하고 Gemini AI로 신뢰할 수 있는 루브릭 초안을 생성하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7c8a84] hover:text-[#1c2623] rounded-xl hover:bg-[#f5f2eb] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="create-assessment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-[#fdf3f0] border border-[#f5dcd5] text-[#a14022] text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#b44826]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#142823] flex items-center gap-2 border-b border-[#eae5da] pb-2">
              <span className="w-5 h-5 rounded-full bg-[#1b3831] text-[#f7f6f2] text-xs flex items-center justify-center font-bold">1</span>
              평가 기본 정보
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#45504c] mb-1">
                  평가 이름 <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 기후 위기 대응과 청소년의 실천 방안"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#45504c] mb-1">교과목</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#45504c] mb-1">대상 학년</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="예: 중학교 2학년, 고등학교 1학년"
                  className="w-full text-xs px-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#45504c] mb-1">
                  제출 유형 <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('speaking')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                      submissionType === 'speaking'
                        ? 'bg-[#eaf1ed] border-[#1b3831] text-[#1b3831] ring-1 ring-[#1b3831]'
                        : 'bg-white border-[#d8d3c7] text-[#63706b] hover:bg-[#faf8f5]'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 text-[#1b3831]" /> 말하기(녹음)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('writing')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                      submissionType === 'writing'
                        ? 'bg-[#fdf7ed] border-[#b45309] text-[#8f5c1a] ring-1 ring-[#b45309]'
                        : 'bg-white border-[#d8d3c7] text-[#63706b] hover:bg-[#faf8f5]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#b45309]" /> 쓰기(글)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('both')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                      submissionType === 'both'
                        ? 'bg-[#eaf1ed] border-[#0f766e] text-[#0f766e] ring-1 ring-[#0f766e]'
                        : 'bg-white border-[#d8d3c7] text-[#63706b] hover:bg-[#faf8f5]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-[#0f766e]" /> 말하기+쓰기
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#45504c] mb-1">
                성취기준 (자유 입력)
              </label>
              <input
                type="text"
                value={achievementStandard}
                onChange={(e) => setAchievementStandard(e.target.value)}
                placeholder="예: [09영03-04] 친숙한 일반적 주제에 관하여 자신의 의견이나 생각을 말하거나 쓸 수 있다."
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#45504c] mb-1">
                과제 안내문 (학생에게 제시되는 주제 프롬프트)
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="학생들이 발표하거나 작성해야 할 핵심 주제 및 가이드라인을 구체적으로 적어주세요."
                className="w-full text-xs p-3 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden leading-relaxed"
              />
            </div>

            {/* Submission Limits */}
            <div className="bg-white p-4 rounded-2xl border border-[#eae5da] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {submissionType !== 'writing' && (
                <div>
                  <label className="block font-bold text-[#45504c] mb-1">
                    말하기 제한 시간(초)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={30}
                      max={600}
                      step={10}
                      value={timeLimitSec}
                      onChange={(e) => setTimeLimitSec(parseInt(e.target.value) || 60)}
                      className="w-24 px-2 py-1.5 bg-[#faf8f5] border border-[#d8d3c7] rounded-xl font-mono font-bold text-center"
                    />
                    <span className="text-[#63706b]">초 (권장: 60~120초)</span>
                  </div>
                </div>
              )}

              {submissionType !== 'speaking' && (
                <div>
                  <label className="block font-bold text-[#45504c] mb-1">
                    쓰기 글자 수 범위 (공백 제외)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={50}
                      max={2000}
                      step={50}
                      value={charMin}
                      onChange={(e) => setCharMin(parseInt(e.target.value) || 100)}
                      className="w-20 px-2 py-1.5 bg-[#faf8f5] border border-[#d8d3c7] rounded-xl font-mono text-center"
                    />
                    <span className="text-[#8b9893]">~</span>
                    <input
                      type="number"
                      min={100}
                      max={3000}
                      step={50}
                      value={charMax}
                      onChange={(e) => setCharMax(parseInt(e.target.value) || 400)}
                      className="w-20 px-2 py-1.5 bg-[#faf8f5] border border-[#d8d3c7] rounded-xl font-mono text-center"
                    />
                    <span className="text-[#63706b]">자</span>
                  </div>
                </div>
              )}
            </div>

            {/* Grading Mode Selection */}
            <div className="bg-[#f5f2eb] p-4 rounded-2xl border border-[#eae5da]">
              <label className="block text-xs font-bold text-[#142823] mb-2">
                채점 모드 선택
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2.5">
                <label
                  onClick={() => setGradingMode('content')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    gradingMode === 'content'
                      ? 'bg-white border-[#1b3831] ring-1 ring-[#1b3831] shadow-2xs'
                      : 'bg-white/60 border-[#eae5da] hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="gradingMode"
                    checked={gradingMode === 'content'}
                    onChange={() => setGradingMode('content')}
                    className="mt-0.5 text-[#1b3831]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#142823]">내용 중심 (기본 권장)</div>
                    <div className="text-[11px] text-[#63706b] mt-0.5">
                      의미 전달과 논리적 내용 구성을 최우선으로 평가합니다.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setGradingMode('fluency')}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    gradingMode === 'fluency'
                      ? 'bg-white border-[#1b3831] ring-1 ring-[#1b3831] shadow-2xs'
                      : 'bg-white/60 border-[#eae5da] hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="gradingMode"
                    checked={gradingMode === 'fluency'}
                    onChange={() => setGradingMode('fluency')}
                    className="mt-0.5 text-[#1b3831]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#142823]">내용 + 표현·유창성</div>
                    <div className="text-[11px] text-[#63706b] mt-0.5">
                      내용 충실성과 함께 발화의 유창성이나 문장의 완성도를 함께 평가합니다.
                    </div>
                  </div>
                </label>
              </div>

              {/* Strict Notice banner as specified */}
              <div className="text-[11px] text-[#45504c] bg-white p-3 rounded-xl border border-[#eae5da] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#1b3831] shrink-0" />
                <span>
                  <strong>원칙 안내: </strong>[내용 중심] 모드에서는 발음, 억양, 말더듬, 목소리 크기, 맞춤법·타자 실수로 감점하지 않고 의미 전달력에 집중합니다.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Rubric Criteria & AI Generator */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-[#eae5da] pb-2">
              <h3 className="text-sm font-bold text-[#142823] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1b3831] text-[#f7f6f2] text-xs flex items-center justify-center font-bold">2</span>
                채점 루브릭 (평가 기준) 설정
              </h3>

              <button
                type="button"
                onClick={handleGenerateRubricWithAI}
                disabled={isGeneratingRubric}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b3831] hover:bg-[#142b26] disabled:opacity-40 text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#a8d4c5]" />
                {isGeneratingRubric ? 'AI 루브릭 생성 중...' : 'AI로 루브릭 초안 만들기'}
              </button>
            </div>

            {/* Criteria Editor List */}
            <div className="space-y-4">
              {criteria.map((c, idx) => (
                <div key={c.id} className="p-4 bg-white border border-[#eae5da] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs font-bold text-[#8b9893]">#{idx + 1}</span>
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => {
                          const updated = [...criteria];
                          updated[idx].name = e.target.value;
                          setCriteria(updated);
                        }}
                        className="text-xs font-bold px-2 py-1 bg-[#faf8f5] border border-[#d8d3c7] rounded-lg focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden w-64"
                      />

                      {submissionType === 'both' && (
                        <select
                          value={c.target}
                          onChange={(e) => {
                            const updated = [...criteria];
                            updated[idx].target = e.target.value as any;
                            setCriteria(updated);
                          }}
                          className="text-xs px-2 py-1 bg-[#faf8f5] border border-[#d8d3c7] rounded-lg"
                        >
                          <option value="both">말하기 + 쓰기 공통</option>
                          <option value="speaking">말하기 기준</option>
                          <option value="writing">쓰기 기준</option>
                        </select>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-[#525f5a]">
                        <span>배점:</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={c.maxScore}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 5;
                            const updated = [...criteria];
                            updated[idx].maxScore = val;
                            updated[idx].levels.high.score = val;
                            setCriteria(updated);
                          }}
                          className="w-12 px-1 py-1 bg-[#faf8f5] border border-[#d8d3c7] rounded-lg text-center font-mono font-bold text-xs"
                        />
                        <span>점</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(c.id)}
                        className="p-1 text-[#8b9893] hover:text-[#b44826] rounded cursor-pointer"
                        title="항목 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Level Descriptions (상 / 중 / 하) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {(['high', 'mid', 'low'] as const).map((lvlKey) => {
                      const lvl = c.levels[lvlKey];
                      return (
                        <div key={lvlKey} className="bg-[#faf8f5] p-2.5 rounded-xl border border-[#eae5da] text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#142823]">
                              {lvl.label} 수준
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step={0.5}
                                value={lvl.score}
                                onChange={(e) => {
                                  const updated = [...criteria];
                                  updated[idx].levels[lvlKey].score = parseFloat(e.target.value) || 0;
                                  setCriteria(updated);
                                }}
                                className="w-11 px-1 py-0.5 bg-white border border-[#d8d3c7] rounded text-center font-mono font-bold text-xs"
                              />
                              <span className="text-[10px] text-[#8b9893]">점</span>
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={lvl.desc}
                            onChange={(e) => {
                              const updated = [...criteria];
                              updated[idx].levels[lvlKey].desc = e.target.value;
                              setCriteria(updated);
                            }}
                            className="w-full text-[11px] p-2 bg-white border border-[#d8d3c7] rounded-lg leading-relaxed focus:border-[#1b3831] focus:outline-hidden"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddCriterion}
                className="w-full py-2.5 bg-white hover:bg-[#faf8f5] border border-dashed border-[#d8d3c7] text-[#525f5a] text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                루브릭 평가 항목 추가하기
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-[#eae5da] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#63706b]">
            * 생성된 평가는 고유한 6자리 코드 및 QR 코드가 부여되어 학생에게 바로 안내할 수 있습니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              form="create-assessment-form"
              className="px-5 py-2 bg-[#1b3831] hover:bg-[#142b26] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              평가 만들기 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
