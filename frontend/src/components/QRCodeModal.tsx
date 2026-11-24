import React, { useEffect, useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import { Assessment } from '../types';

interface QRCodeModalProps {
  assessment: Assessment;
  isOpen: boolean;
  onClose: () => void;
  onSwitchToStudentView?: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  assessment,
  isOpen,
  onClose,
  onSwitchToStudentView,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen && assessment) {
      // Create student URL or code
      const studentUrl = `${window.location.origin}/?code=${assessment.code}&role=student`;
      QRCode.toDataURL(studentUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error', err));
    }
  }, [isOpen, assessment]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(assessment.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">{assessment.title}</h3>
        <p className="text-xs text-slate-500 mt-1">
          교실 칠판이나 프로젝터에 띄워 학생들이 모바일로 접속하게 하세요.
        </p>

        {/* Big 6-digit Code */}
        <div className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            학생 접속 6자리 제출 코드
          </div>
          <div className="text-4xl font-black font-mono tracking-widest text-indigo-700 select-all">
            {assessment.code}
          </div>
          <button
            onClick={handleCopyCode}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>코드 복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>코드 복사하기</span>
              </>
            )}
          </button>
        </div>

        {/* QR Code Canvas/Image */}
        <div className="flex justify-center p-3 bg-white border border-slate-200 rounded-2xl shadow-inner max-w-[280px] mx-auto mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="학생 제출용 QR 코드" className="w-full h-auto rounded-lg" />
          ) : (
            <div className="w-60 h-60 flex items-center justify-center text-xs text-slate-400">
              QR 코드 생성 중...
            </div>
          )}
        </div>

        {/* Quick Demo Switcher */}
        {onSwitchToStudentView && (
          <button
            onClick={() => {
              onClose();
              onSwitchToStudentView();
            }}
            className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <ExternalLink className="w-4 h-4" />
            이 코드로 학생 제출 화면 바로 체험하기
          </button>
        )}
      </div>
    </div>
  );
};
