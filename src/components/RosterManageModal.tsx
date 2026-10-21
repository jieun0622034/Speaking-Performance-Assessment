import React, { useState } from 'react';
import { X, Users, UserPlus, ListPlus, Trash2, Check, AlertCircle } from 'lucide-react';
import { Assessment, Submission } from '../types';

interface RosterManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  existingSubmissions: Submission[];
  onAddStudents: (newStudents: { studentNumber: string; studentName: string }[]) => void;
}

export const RosterManageModal: React.FC<RosterManageModalProps> = ({
  isOpen,
  onClose,
  assessment,
  existingSubmissions,
  onAddStudents,
}) => {
  const [tab, setTab] = useState<'single' | 'batch' | 'auto'>('auto');
  const [singleNumber, setSingleNumber] = useState('');
  const [singleName, setSingleName] = useState('');

  // Auto generate 1~N
  const [autoCount, setAutoCount] = useState(25);

  // Bulk names paste
  const [bulkNamesText, setBulkNamesText] = useState(
    '김민서\n박준우\n이지안\n최현우\n정다은\n강태윤\n조예은\n윤서준\n임채원\n한지호'
  );

  if (!isOpen) return null;

  // Single Add
  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleNumber.trim() || !singleName.trim()) return;

    onAddStudents([
      {
        studentNumber: singleNumber.trim().padStart(2, '0'),
        studentName: singleName.trim(),
      },
    ]);
    setSingleNumber('');
    setSingleName('');
  };

  // Auto generate 1~N
  const handleAutoGenerate = () => {
    const students: { studentNumber: string; studentName: string }[] = [];
    const existingNumbers = new Set(existingSubmissions.map((s) => s.studentNumber));

    for (let i = 1; i <= autoCount; i++) {
      const numStr = i.toString().padStart(2, '0');
      if (!existingNumbers.has(numStr)) {
        students.push({
          studentNumber: numStr,
          studentName: `학생 ${i}번`,
        });
      }
    }

    if (students.length === 0) {
      alert('이미 생성하려는 번호가 명렬표에 모두 존재합니다.');
      return;
    }

    onAddStudents(students);
    onClose();
  };

  // Bulk parse names
  const handleBulkAdd = () => {
    const lines = bulkNamesText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const existingNumbers = new Set(existingSubmissions.map((s) => parseInt(s.studentNumber, 10)));
    let nextNum = 1;
    while (existingNumbers.has(nextNum)) nextNum++;

    const students: { studentNumber: string; studentName: string }[] = [];
    lines.forEach((name) => {
      while (existingNumbers.has(nextNum)) nextNum++;
      students.push({
        studentNumber: nextNum.toString().padStart(2, '0'),
        studentName: name,
      });
      existingNumbers.add(nextNum);
      nextNum++;
    });

    onAddStudents(students);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#142823]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#faf8f5] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-[#eae5da] space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#eae5da] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1b3831] text-[#f7f6f2] flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#142823]">학급 명렬표 관리</h3>
              <p className="text-xs text-[#63706b]">학생 번호와 이름을 등록하여 순서대로 현장 대면 채점하세요.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#7c8a84] hover:text-[#1c2623] rounded-full hover:bg-[#f5f2eb] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#ede8df] rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('auto')}
            className={`py-2 rounded-lg transition cursor-pointer ${
              tab === 'auto' ? 'bg-white text-[#1b3831] shadow-2xs' : 'text-[#63706b] hover:text-[#1c2623]'
            }`}
          >
            1번~N번 일괄생성
          </button>
          <button
            type="button"
            onClick={() => setTab('batch')}
            className={`py-2 rounded-lg transition cursor-pointer ${
              tab === 'batch' ? 'bg-white text-[#1b3831] shadow-2xs' : 'text-[#63706b] hover:text-[#1c2623]'
            }`}
          >
            이름 목록 붙여넣기
          </button>
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`py-2 rounded-lg transition cursor-pointer ${
              tab === 'single' ? 'bg-white text-[#1b3831] shadow-2xs' : 'text-[#63706b] hover:text-[#1c2623]'
            }`}
          >
            학생 1명씩 추가
          </button>
        </div>

        {/* TAB 1: Auto 1~N */}
        {tab === 'auto' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-white border border-[#eae5da] rounded-2xl text-xs space-y-2">
              <label className="font-bold text-[#142823] block">학급 전체 인원 수 설정</label>
              <p className="text-[#63706b]">
                1번부터 지정한 인원수까지 미등록된 학생 번호를 일괄 추가합니다.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  min={1}
                  max={45}
                  value={autoCount}
                  onChange={(e) => setAutoCount(parseInt(e.target.value) || 25)}
                  className="w-24 px-3 py-2 bg-[#faf8f5] border border-[#d8d3c7] rounded-xl font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-[#45504c] font-bold">명 (1번 ~ {autoCount}번)</span>
              </div>
            </div>

            <button
              onClick={handleAutoGenerate}
              className="w-full py-3 bg-[#1b3831] hover:bg-[#142b26] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ListPlus className="w-4 h-4" />
              <span>명렬표 일괄 자동 생성</span>
            </button>
          </div>
        )}

        {/* TAB 2: Batch Paste Names */}
        {tab === 'batch' && (
          <div className="space-y-3 py-1">
            <div>
              <label className="block text-xs font-bold text-[#45504c] mb-1">
                학생 이름 목록 (한 줄에 한 명씩 붙여넣기)
              </label>
              <textarea
                rows={6}
                value={bulkNamesText}
                onChange={(e) => setBulkNamesText(e.target.value)}
                placeholder="김민서&#10;박준우&#10;이지안..."
                className="w-full text-xs p-3 bg-white border border-[#d8d3c7] rounded-xl leading-relaxed focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
              />
            </div>

            <button
              onClick={handleBulkAdd}
              className="w-full py-3 bg-[#1b3831] hover:bg-[#142b26] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>이름 목록 학생 일괄 등록</span>
            </button>
          </div>
        )}

        {/* TAB 3: Single Add */}
        {tab === 'single' && (
          <form onSubmit={handleAddSingle} className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#45504c] mb-1">학생 번호</label>
                <input
                  type="text"
                  required
                  placeholder="예: 05"
                  value={singleNumber}
                  onChange={(e) => setSingleNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#d8d3c7] rounded-xl text-center font-mono font-bold focus:border-[#1b3831] focus:outline-hidden"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[#45504c] mb-1">학생 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 홍길동"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-[#d8d3c7] rounded-xl focus:border-[#1b3831] focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1b3831] hover:bg-[#142b26] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>학생 1명 추가</span>
            </button>
          </form>
        )}

        {/* Current Roster Count */}
        <div className="p-3 bg-white border border-[#eae5da] rounded-xl text-xs text-[#525f5a] flex items-center justify-between">
          <span>현재 등록된 학생: <strong className="text-[#142823]">{existingSubmissions.length}명</strong></span>
          <span className="text-[11px] text-[#7c8a84]">
            {existingSubmissions.length > 0
              ? `${existingSubmissions[0].studentNumber}번 ~ ${existingSubmissions[existingSubmissions.length - 1].studentNumber}번`
              : '명렬표 비어있음'}
          </span>
        </div>
      </div>
    </div>
  );
};
