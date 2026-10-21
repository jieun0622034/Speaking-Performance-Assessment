import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  RotateCcw,
  Play,
  Pause,
  Upload,
  X,
  Sparkles,
  AlertCircle,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Assessment } from '../types';
import { blobToBase64 } from '../utils/storage';

interface OnSiteRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment;
  student: { studentNumber: string; studentName: string; submissionId?: string };
  onRecordingComplete: (audioBlob: Blob, base64: string, durationSec: number) => Promise<void>;
  onNextStudent?: () => void;
  hasNextStudent?: boolean;
}

export const OnSiteRecorderModal: React.FC<OnSiteRecorderModalProps> = ({
  isOpen,
  onClose,
  assessment,
  student,
  onRecordingComplete,
}) => {
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [showPrompt, setShowPrompt] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  const timeLimit = assessment.timeLimitSec || 90;

  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
    }
    return () => {
      cleanupRecording();
    };
  }, [isOpen]);

  const cleanupRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordedBlob(null);
    setElapsedSec(0);
    setAudioLevel(0);
    setMicError(null);
    setLiveTranscript('');
  };

  if (!isOpen) return null;

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordedBlob(null);
    setLiveTranscript('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio level visualizer
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        updateLevel();
      } catch (e) {
        console.warn(e);
      }

      // Live Web Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = assessment.subject.includes('영어') ? 'en-US' : 'ko-KR';

          recognizer.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            if (transcript.trim()) {
              setLiveTranscript((prev) => (prev + ' ' + transcript).trim());
            }
          };
          recognizer.start();
          speechRecognitionRef.current = recognizer;
        } catch {}
      }

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
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {}
        }
        setAudioLevel(0);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setElapsedSec(0);

      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          if (prev + 1 >= timeLimit) {
            stopRecording();
            return timeLimit;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setMicError('마이크 접근 권한이 필요합니다.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setElapsedSec((prev) => {
          if (prev + 1 >= timeLimit) {
            stopRecording();
            return timeLimit;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play().catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setRecordedBlob(file);
    setAudioUrl(url);
    setElapsedSec(30);
  };

  const handleAnalyzeAndSave = async () => {
    if (!recordedBlob) return;
    setIsAnalyzing(true);
    try {
      const base64 = await blobToBase64(recordedBlob);
      await onRecordingComplete(recordedBlob, base64, Math.max(1, elapsedSec));
      onClose();
    } catch (err) {
      console.error(err);
      alert('녹음 저장 및 AI 채점 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#142823]/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Container: clean, focused, spacious */}
      <div className="bg-[#faf8f5] w-full h-full sm:h-auto sm:max-w-md sm:rounded-3xl border-0 sm:border border-[#eae5da] shadow-2xl flex flex-col justify-between overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-white border-b border-[#eae5da] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-[#f5f2eb] text-[#142823] px-2 py-0.5 rounded-md">
              {student.studentNumber}번
            </span>
            <h3 className="text-base font-bold text-[#142823]">
              {student.studentName} 학생
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'record' ? 'upload' : 'record')}
              className="text-[11px] text-[#7c8a84] hover:text-[#142823] underline cursor-pointer"
            >
              {mode === 'record' ? '파일 업로드' : '마이크 녹음'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#7c8a84] hover:text-[#1c2623] rounded-full hover:bg-[#f5f2eb] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 flex flex-col justify-center text-center">
          {/* Subtle Prompt Toggle */}
          <div>
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="text-xs text-[#7c8a84] hover:text-[#142823] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>과제 안내문 {showPrompt ? '접기' : '보기'}</span>
              {showPrompt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showPrompt && (
              <p className="mt-2 text-xs text-[#525f5a] bg-white p-3 rounded-xl border border-[#eae5da] leading-relaxed text-left animate-in fade-in">
                {assessment.prompt}
              </p>
            )}
          </div>

          {micError && (
            <div className="p-3 bg-[#fdf3f0] border border-[#f5dcd5] text-[#a14022] text-xs rounded-xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#b44826]" />
              <span>{micError}</span>
            </div>
          )}

          {mode === 'record' ? (
            <div className="space-y-6 my-auto">
              {/* Big, clean central timer */}
              <div>
                <div className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-[#142823]">
                  {Math.floor(elapsedSec / 60)}:
                  {(elapsedSec % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-[#7c8a84] mt-1 font-mono">
                  제한: {Math.floor(timeLimit / 60)}분 {timeLimit % 60}초
                </div>
              </div>

              {/* Pulsing Visualizer Bar */}
              {isRecording && (
                <div className="max-w-[200px] mx-auto space-y-1.5">
                  <div className="w-full bg-[#f0ece3] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1b3831] h-full transition-all duration-75 rounded-full"
                      style={{ width: `${Math.max(8, audioLevel)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-[#b4532b] font-medium animate-pulse">
                    {isPaused ? '일시 정지됨' : '학생 발화 녹음 중...'}
                  </div>
                </div>
              )}

              {/* Live Speech Recognition text (compact) */}
              {isRecording && liveTranscript && (
                <p className="text-xs text-[#525f5a] italic px-4 line-clamp-3 leading-relaxed">
                  "{liveTranscript}"
                </p>
              )}

              {/* Large Tactile Buttons */}
              <div className="flex items-center justify-center gap-3">
                {!isRecording && !recordedBlob && (
                  <button
                    onClick={startRecording}
                    className="w-20 h-20 rounded-full bg-[#1b3831] hover:bg-[#142b26] active:scale-95 text-[#f7f6f2] flex flex-col items-center justify-center shadow-md transition cursor-pointer"
                  >
                    <Mic className="w-7 h-7" />
                    <span className="text-[11px] font-bold mt-1">녹음</span>
                  </button>
                )}

                {isRecording && (
                  <>
                    <button
                      onClick={isPaused ? resumeRecording : pauseRecording}
                      className="w-14 h-14 rounded-full bg-white border border-[#d8d3c7] hover:bg-[#faf8f5] text-[#525f5a] flex items-center justify-center transition cursor-pointer"
                    >
                      {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={stopRecording}
                      className="w-20 h-20 rounded-full bg-[#b4532b] hover:bg-[#96421f] active:scale-95 text-white flex flex-col items-center justify-center shadow-md transition cursor-pointer"
                    >
                      <Square className="w-6 h-6 fill-current" />
                      <span className="text-[11px] font-bold mt-1">완료</span>
                    </button>
                  </>
                )}

                {!isRecording && recordedBlob && (
                  <div className="space-y-3 w-full">
                    {audioUrl && (
                      <audio
                        ref={previewAudioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlayingPreview(false)}
                        onPlay={() => setIsPlayingPreview(true)}
                        onPause={() => setIsPlayingPreview(false)}
                        className="hidden"
                      />
                    )}

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={togglePreview}
                        className="px-4 py-2.5 bg-white border border-[#eae5da] hover:bg-[#faf8f5] text-[#142823] text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current text-[#1b3831]" />}
                        <span>청취 확인 ({elapsedSec}초)</span>
                      </button>

                      <button
                        onClick={startRecording}
                        className="px-3.5 py-2.5 text-xs text-[#7c8a84] hover:text-[#142823] transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>다시 녹음</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white border border-[#eae5da] rounded-2xl text-center space-y-3">
              <Upload className="w-8 h-8 text-[#7c8a84] mx-auto" />
              <div className="text-xs text-[#525f5a]">
                기기에 저장된 음성 파일(m4a, mp3, wav)을 선택하세요.
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="text-xs text-[#525f5a] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1b3831] file:text-[#f7f6f2] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="bg-white border-t border-[#eae5da] p-4 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-[#f5f2eb] hover:bg-[#eae5da] text-[#525f5a] font-bold text-xs rounded-xl transition cursor-pointer"
          >
            닫기
          </button>

          <button
            disabled={!recordedBlob || isAnalyzing}
            onClick={handleAnalyzeAndSave}
            className="flex-1 py-2.5 px-4 bg-[#1b3831] hover:bg-[#142b26] disabled:opacity-40 text-[#f7f6f2] font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#a8d4c5]" />
            <span>{isAnalyzing ? 'AI 채점 분석 중...' : 'AI 즉시 채점 요청'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
