import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, FastForward, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { TranscriptSentence } from '../types';

interface AudioPlayerWithTimestampsProps {
  audioBlob?: Blob | null;
  audioBase64?: string;
  transcript: TranscriptSentence[];
  activeEvidenceRange?: { start_sec: number; end_sec: number } | null;
  onSelectEvidence?: (range: { start_sec: number; end_sec: number } | null) => void;
}

export const AudioPlayerWithTimestamps: React.FC<AudioPlayerWithTimestampsProps> = ({
  audioBlob,
  audioBase64,
  transcript,
  activeEvidenceRange,
  onSelectEvidence,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Prepare audio URL
  useEffect(() => {
    let url: string | null = null;
    if (audioBlob) {
      url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } else if (audioBase64) {
      setAudioUrl(`data:audio/wav;base64,${audioBase64}`);
    } else {
      setAudioUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioBlob, audioBase64]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error('Play error', err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const seekTo = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, sec);
      setCurrentTime(sec);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  useEffect(() => {
    if (activeEvidenceRange && audioRef.current) {
      seekTo(activeEvidenceRange.start_sec);
    }
  }, [activeEvidenceRange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentSentenceIndex = transcript.findIndex(
    (sent) => currentTime >= sent.start_sec && currentTime <= (sent.end_sec + 0.5)
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#e8e6e1] shadow-2xs overflow-hidden font-sans">
      {/* Audio Controller Header */}
      <div className="bg-[#fcfbf9] p-4 border-b border-[#eceae5]">
        {audioUrl ? (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="text-xs text-[#8f5c1a] bg-[#fdf7ed] p-2.5 rounded-xl mb-2 flex items-center gap-1.5 border border-[#f3ddb3]">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#b45309]" />
            <span>오디오 데이터가 준비 중이거나 로드 중입니다.</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-3">
          <input
            type="range"
            min={0}
            max={duration || (transcript[transcript.length - 1]?.end_sec || 30)}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              seekTo(val);
            }}
            className="w-full h-1.5 bg-[#e4e1d8] rounded-lg appearance-none cursor-pointer accent-[#1e3a34]"
          />
          <div className="flex justify-between items-center text-xs font-mono text-[#787f7b]">
            <span className="font-semibold text-[#1b2522]">{formatTime(currentTime)}</span>
            <span>{formatTime(duration || (transcript[transcript.length - 1]?.end_sec || 0))}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => seekTo(0)}
              className="p-2 text-[#787f7b] hover:text-[#1b2522] hover:bg-[#eeebe4] rounded-lg transition"
              title="처음으로 되돌리기"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1e3a34] hover:bg-[#162d28] text-[#f7f6f2] shadow-xs transition active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div className="flex items-center gap-1 ml-1 text-xs text-[#525a55] font-medium">
              <Volume2 className="w-4 h-4 text-[#8a918d]" />
              <span>{isPlaying ? '재생 중' : '일시정지'}</span>
            </div>
          </div>

          {/* Speed selectors */}
          <div className="flex items-center bg-[#eeebe4] p-0.5 rounded-lg text-xs font-medium text-[#525a55]">
            {[1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-1 rounded-md transition ${
                  playbackRate === rate ? 'bg-white text-[#1e3a34] shadow-xs font-bold' : 'hover:text-[#1b2522]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transcript Header */}
      <div className="px-4 py-2.5 bg-[#f6f4ef] border-b border-[#eae7e1] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1b2522]">
          <Sparkles className="w-3.5 h-3.5 text-[#2c534b]" />
          <span>STT 전사 원문 (문장 클릭 시 해당 구간으로 이동)</span>
        </div>
        <span className="text-[11px] text-[#787f7b]">총 {transcript.length}개 문장</span>
      </div>

      {/* Transcript Sentences List */}
      <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-2.5 min-h-0">
        {transcript.length === 0 ? (
          <div className="text-center py-12 text-[#8a918d] text-sm">전사된 원문이 없습니다.</div>
        ) : (
          transcript.map((sentence, idx) => {
            const isPlayingThis = idx === currentSentenceIndex;
            const isEvidence =
              activeEvidenceRange &&
              sentence.start_sec >= activeEvidenceRange.start_sec - 1 &&
              sentence.end_sec <= activeEvidenceRange.end_sec + 1;

            const hasUnclear = sentence.text.includes('[불명확]');

            return (
              <div
                key={idx}
                onClick={() => {
                  seekTo(sentence.start_sec);
                  if (onSelectEvidence) {
                    onSelectEvidence({ start_sec: sentence.start_sec, end_sec: sentence.end_sec });
                  }
                }}
                className={`group relative p-3 rounded-xl border transition cursor-pointer text-left ${
                  isPlayingThis
                    ? 'bg-[#f0f5f2] border-[#2c534b] shadow-xs ring-1 ring-[#2c534b]/20'
                    : isEvidence
                    ? 'bg-[#fcf8ed] border-[#e8d5aa]'
                    : 'bg-white border-[#eae7e1] hover:border-[#1e3a34]/30 hover:bg-[#faf9f7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition ${
                        isPlayingThis
                          ? 'bg-[#1e3a34] text-[#f7f6f2]'
                          : 'bg-[#f4f2ee] text-[#525a55] group-hover:bg-[#e7f0ec] group-hover:text-[#1e3a34]'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {formatTime(sentence.start_sec)}
                    </span>
                    <span className="text-[11px] text-[#9ba29e] font-mono">
                      ~ {formatTime(sentence.end_sec)}
                    </span>
                    {isPlayingThis && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e3a34] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a34]"></span>
                        재생 중
                      </span>
                    )}
                  </div>

                  {hasUnclear && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-[#fdf3f2] text-[#9b2c2c] px-1.5 py-0.5 rounded border border-[#f5d5d3]">
                      <AlertCircle className="w-3 h-3" />
                      음성 불명확
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-[#1b2522]">
                  {sentence.text.split('[불명확]').map((part, pIdx, arr) => (
                    <React.Fragment key={pIdx}>
                      {part}
                      {pIdx < arr.length - 1 && (
                        <span className="bg-[#fde2e2] text-[#9b2c2c] font-semibold px-1 rounded mx-0.5">
                          [불명확]
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
