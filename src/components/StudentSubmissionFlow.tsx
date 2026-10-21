import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Square,
  Shield,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Assessment, Submission } from '../types';
import { saveAudioBlob, blobToBase64 } from '../utils/storage';

interface StudentSubmissionFlowProps {
  initialCode?: string;
  assessments: Assessment[];
  onSubmit: (submission: Submission) => void;
  onSwitchToTeacher: () => void;
}

export const StudentSubmissionFlow: React.FC<StudentSubmissionFlowProps> = ({
  initialCode = '',
  assessments,
  onSubmit,
  onSwitchToTeacher,
}) => {
  // Steps: 'code' | 'info' | 'submit' | 'completed'
  const [step, setStep] = useState<'code' | 'info' | 'submit' | 'completed'>('code');

  const [inputCode, setInputCode] = useState(initialCode);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [codeError, setCodeError] = useState('');

  // Student Info
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);

  // Speaking state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Writing state
  const [writtenText, setWrittenText] = useState('');
  const [selfWrittenConfirmed, setSelfWrittenConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined flow step if 'both'
  const [combinedStep, setCombinedStep] = useState<'speaking' | 'writing'>('speaking');

  // Handle auto-load from initialCode
  useEffect(() => {
    if (initialCode) {
      const match = assessments.find((a) => a.code === initialCode);
      if (match) {
        setSelectedAssessment(match);
        setStep('info');
      }
    }
  }, [initialCode, assessments]);

  // Clean audio URL on unmount
  useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [recordedAudioUrl]);

  // Check 6-digit code
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    const match = assessments.find((a) => a.code === inputCode.trim());
    if (match) {
      setSelectedAssessment(match);
      setStep('info');
    } else {
      setCodeError('일치하는 평가 코드를 찾을 수 없습니다. 선생님께 확인해 주세요.');
    }
  };

  // Start recording
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordedBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);

        // stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordDuration(0);

      const maxLimit = selectedAssessment?.timeLimitSec || 90;
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev + 1 >= maxLimit) {
            stopRecording();
            return maxLimit;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setMicError(
        '마이크 접근이 차단되었습니다. 브라우저 주소창 왼쪽의 자물쇠/설정 아이콘을 눌러 "마이크 권한"을 허용으로 변경 후 다시 시도해 주세요.'
      );
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Preview playback
  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play().catch(() => {});
    }
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    if (!selectedAssessment) return;
    setIsSubmitting(true);

    try {
      const submissionId = `sub-${Date.now()}`;
      let audioBlobId: string | undefined;
      let audioBase64: string | undefined;

      if (recordedBlob) {
        audioBlobId = `audio-${submissionId}`;
        await saveAudioBlob(audioBlobId, recordedBlob);
        audioBase64 = await blobToBase64(recordedBlob);
      }

      const newSubmission: Submission = {
        id: submissionId,
        assessmentId: selectedAssessment.id,
        studentNumber: studentNumber.trim().padStart(2, '0'),
        studentName: studentName.trim(),
        submissionType: selectedAssessment.submissionType,
        audioBlobId,
        audioDurationSec: recordDuration,
        audioMimeType: recordedBlob?.type || 'audio/webm',
        audioBase64,
        writtenText: writtenText.trim(),
        consentAgreed: true,
        submittedAt: new Date().toISOString(),
      };

      onSubmit(newSubmission);
      setStep('completed');
    } catch (e) {
      console.error('Submission failed', e);
      alert('제출 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeLimit = selectedAssessment?.timeLimitSec || 90;
  const remainingTime = Math.max(0, timeLimit - recordDuration);
  const charCount = writtenText.replace(/\s/g, '').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Mobile-Friendly Header */}
      <header className="max-w-lg w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            AI
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">수행평가 학생 제출</div>
            <div className="text-[10px] text-slate-500">계정 없이 코드로 간편 제출</div>
          </div>
        </div>

        <button
          onClick={onSwitchToTeacher}
          className="text-xs text-slate-500 hover:text-indigo-600 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white"
        >
          교사 화면으로 전환
        </button>
      </header>

      {/* Step 1: Code Entry */}
      {step === 'code' && (
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-slate-900">평가 코드를 입력하세요</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              선생님이 칠판이나 화면에 안내한 6자리 숫자를 입력합니다.
            </p>

            {codeError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <input
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="6자리 숫자"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center text-3xl font-black font-mono tracking-widest py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:border-indigo-600 focus:bg-white focus:outline-hidden"
              />

              <button
                type="submit"
                disabled={inputCode.length !== 6}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm rounded-2xl shadow-sm transition active:scale-98"
              >
                평가 확인하기
              </button>
            </form>

            {/* Quick Demo Helper */}
            {assessments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 text-left">
                <div className="text-[11px] font-bold text-slate-400 mb-2">현재 열려있는 평가 (빠른 선택):</div>
                <div className="space-y-1.5">
                  {assessments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setInputCode(a.code);
                        setSelectedAssessment(a);
                        setStep('info');
                      }}
                      className="w-full p-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left text-xs text-slate-700 flex items-center justify-between transition"
                    >
                      <span className="font-semibold truncate max-w-[200px]">{a.title}</span>
                      <span className="font-mono text-indigo-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                        {a.code}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Assessment Overview & Student Info & Consent */}
      {step === 'info' && selectedAssessment && (
        <div className="max-w-lg w-full mx-auto my-auto py-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            {/* Assessment Info Banner */}
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  {selectedAssessment.subject}
                </span>
                <span className="text-xs text-slate-600 font-medium">{selectedAssessment.grade}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600">
                  {selectedAssessment.submissionType === 'speaking'
                    ? '말하기(녹음)'
                    : selectedAssessment.submissionType === 'writing'
                    ? '쓰기(글 작성)'
                    : '말하기+쓰기 복합'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{selectedAssessment.title}</h2>
              <div className="mt-2.5 p-3 bg-white rounded-xl border border-indigo-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-indigo-900 block mb-1">과제 안내:</span>
                {selectedAssessment.prompt}
              </div>

              {/* Limits info */}
              <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 font-mono">
                {selectedAssessment.timeLimitSec && (
                  <span>제한 시간: {selectedAssessment.timeLimitSec}초</span>
                )}
                {selectedAssessment.charLimitRange && (
                  <span>
                    글자 수: {selectedAssessment.charLimitRange.min}~{selectedAssessment.charLimitRange.max}자
                  </span>
                )}
              </div>
            </div>

            {/* Student Info Inputs */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">학생 정보 입력</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    번호 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    placeholder="예: 7"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    className="w-full text-center text-sm font-mono font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    이름 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full text-sm font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Mandatory Privacy Consent Notice */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1.5">
                <Shield className="w-4 h-4 text-amber-600" />
                개인정보 수집 및 이용 동의 (필수)
              </div>
              <p className="text-xs text-amber-800 leading-relaxed mb-3">
                제출한 음성과 글은 이 수행평가의 채점과 확인 목적으로만 사용되며, 교사가 삭제를 요청하면 완전히 삭제됩니다.
              </p>
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  required
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>안내 사항을 확인하였으며 이에 동의합니다.</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition"
              >
                뒤로가기
              </button>
              <button
                type="button"
                disabled={!studentNumber || !studentName.trim() || !consentAgreed}
                onClick={() => setStep('submit')}
                className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-98 flex items-center justify-center gap-1.5"
              >
                <span>제출 화면으로 이동</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Submission Workspace */}
      {step === 'submit' && selectedAssessment && (
        <div className="max-w-lg w-full mx-auto my-auto py-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full mr-2">
                  {studentNumber}번 {studentName}
                </span>
                <span className="text-xs font-semibold text-slate-500">{selectedAssessment.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep('info')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                정보 수정
              </button>
            </div>

            {/* If 'both' type: Stepper header */}
            {selectedAssessment.submissionType === 'both' && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
                <div
                  className={`py-1.5 rounded-lg transition ${
                    combinedStep === 'speaking'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  1단계: 말하기(녹음)
                </div>
                <div
                  className={`py-1.5 rounded-lg transition ${
                    combinedStep === 'writing'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  2단계: 성찰문 작성
                </div>
              </div>
            )}

            {/* SPEAKING SUBMISSION SECTION */}
            {(selectedAssessment.submissionType === 'speaking' ||
              (selectedAssessment.submissionType === 'both' && combinedStep === 'speaking')) && (
              <div className="space-y-5 text-center">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">말하기 과제 안내문:</span>
                  {selectedAssessment.prompt}
                </div>

                {/* Mic Blocked Error Banner */}
                {micError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl text-left flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">마이크 권한 오류</div>
                      <div className="mt-0.5">{micError}</div>
                    </div>
                  </div>
                )}

                {/* Timer display */}
                <div className="py-2">
                  <div className="text-xs text-slate-500 font-medium">남은 시간</div>
                  <div className="text-4xl font-black font-mono tracking-wider text-slate-800 mt-1">
                    {Math.floor(remainingTime / 60)}:
                    {(remainingTime % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    제한 시간: {timeLimit}초
                  </div>
                </div>

                {/* Big Record / Stop Button */}
                <div className="flex justify-center">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-24 h-24 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex flex-col items-center justify-center shadow-md hover:shadow-lg transition active:scale-95 group"
                    >
                      <Mic className="w-8 h-8 group-hover:scale-110 transition" />
                      <span className="text-xs font-bold mt-1">녹음 시작</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-24 h-24 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex flex-col items-center justify-center shadow-md animate-pulse active:scale-95"
                    >
                      <Square className="w-8 h-8 text-rose-400" />
                      <span className="text-xs font-bold mt-1">녹음 종료</span>
                    </button>
                  )}
                </div>

                {isRecording && (
                  <div className="text-xs font-bold text-rose-600 animate-pulse flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    마이크로 음성을 녹음하고 있습니다...
                  </div>
                )}

                {/* Preview recorded audio */}
                {recordedAudioUrl && !isRecording && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-left space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        녹음 완료 ({recordDuration}초)
                      </span>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        다시 녹음
                      </button>
                    </div>

                    <audio
                      ref={previewAudioRef}
                      src={recordedAudioUrl}
                      onTimeUpdate={() => {
                        if (previewAudioRef.current) {
                          setPreviewCurrentTime(previewAudioRef.current.currentTime);
                        }
                      }}
                      onPlay={() => setIsPlayingPreview(true)}
                      onPause={() => setIsPlayingPreview(false)}
                      onEnded={() => setIsPlayingPreview(false)}
                    />

                    {/* Simple Player Bar */}
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-indigo-100">
                      <button
                        type="button"
                        onClick={togglePreviewPlay}
                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"
                      >
                        {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <div className="flex-1 text-xs text-slate-600 font-mono">
                        {Math.floor(previewCurrentTime / 60)}:
                        {Math.floor(previewCurrentTime % 60).toString().padStart(2, '0')}{' '}
                        / {Math.floor(recordDuration / 60)}:
                        {(recordDuration % 60).toString().padStart(2, '0')}
                      </div>
                      <span className="text-[11px] text-indigo-700 font-semibold">제출 전 들어보기</span>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                {selectedAssessment.submissionType === 'both' ? (
                  <button
                    type="button"
                    disabled={!recordedBlob}
                    onClick={() => setCombinedStep('writing')}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <span>다음: 성찰문 작성으로 이동</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!recordedBlob || isSubmitting}
                    onClick={handleFinalSubmit}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-98"
                  >
                    {isSubmitting ? '제출 중...' : '녹음 최종 제출하기'}
                  </button>
                )}
              </div>
            )}

            {/* WRITING SUBMISSION SECTION */}
            {(selectedAssessment.submissionType === 'writing' ||
              (selectedAssessment.submissionType === 'both' && combinedStep === 'writing')) && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">쓰기 과제 안내문:</span>
                  {selectedAssessment.prompt}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <label className="font-bold text-slate-700">글 작성 상자</label>
                    <span
                      className={`font-mono font-bold ${
                        selectedAssessment.charLimitRange &&
                        (charCount < selectedAssessment.charLimitRange.min ||
                          charCount > selectedAssessment.charLimitRange.max)
                          ? 'text-amber-600'
                          : 'text-indigo-600'
                      }`}
                    >
                      {charCount}자 작성됨 (공백 제외)
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    required
                    placeholder="과제 요구사항에 맞게 직접 글을 작성하세요. (작성 중인 내용은 브라우저에 임시 저장됩니다)"
                    value={writtenText}
                    onChange={(e) => setWrittenText(e.target.value)}
                    className="w-full text-sm p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-hidden leading-relaxed"
                  />
                </div>

                {/* Self-written check requirement */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                    <input
                      type="checkbox"
                      required
                      checked={selfWrittenConfirmed}
                      onChange={(e) => setSelfWrittenConfirmed(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span>본인이 직접 작성한 글이 맞습니까? (확인)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {selectedAssessment.submissionType === 'both' && (
                    <button
                      type="button"
                      onClick={() => setCombinedStep('speaking')}
                      className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition"
                    >
                      녹음 단계로
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!writtenText.trim() || !selfWrittenConfirmed || isSubmitting}
                    onClick={handleFinalSubmit}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-98"
                  >
                    {isSubmitting ? '제출 중...' : '과제 최종 제출하기'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Submission Completed (Strictly no scores leaked to students) */}
      {step === 'completed' && (
        <div className="max-w-md w-full mx-auto my-auto py-10 text-center">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-black text-slate-900">제출되었습니다</h2>
            <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
              결과는 선생님이 꼼꼼히 확인하고 승인한 뒤에 안내해요. 수고 많았습니다!
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 text-left space-y-1 mb-6">
              <div>• 학생: {studentNumber}번 {studentName}</div>
              <div>• 평가: {selectedAssessment?.title}</div>
              <div>• 제출 시각: {new Date().toLocaleTimeString('ko-KR')}</div>
            </div>

            <button
              onClick={onSwitchToTeacher}
              className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-2xl transition"
            >
              교사 화면으로 이동하여 채점 확인하기
            </button>
          </div>
        </div>
      )}

      {/* Bottom Footer Note */}
      <footer className="max-w-lg w-full mx-auto text-center pt-4 text-[11px] text-slate-400">
        수행평가 AI 채점 도우미 • 학생용 제출 인터페이스
      </footer>
    </div>
  );
};
