import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Building2,
  BookOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { TeacherUser } from '../types';
import { registerTeacher, authenticateTeacher, DEMO_TEACHER, saveCurrentTeacher } from '../utils/storage';

interface TeacherAuthModalProps {
  isOpen: boolean;
  onSuccess: (teacher: TeacherUser) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  canDismiss = false,
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('teacher@school.kr');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [subject, setSubject] = useState('영어');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const user = authenticateTeacher(email.trim(), password);
      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('선생님 성함을 입력해 주세요.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = registerTeacher(
        {
          name: name.trim(),
          email: email.trim(),
          school: school.trim() || '소속 학교',
          subject: subject.trim() || '영어',
        },
        password
      );
      onSuccess(newUser);
    } catch (err: any) {
      setErrorMsg(err.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastDemoLogin = () => {
    saveCurrentTeacher(DEMO_TEACHER);
    onSuccess(DEMO_TEACHER);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#161a19]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#fcfbf9] rounded-3xl max-w-md w-full border border-[#e8e6e1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Subtle Top Header with Brand */}
        <div className="pt-8 pb-5 px-6 sm:px-8 text-center border-b border-[#eceae5] bg-white relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-[#8a918d] hover:text-[#1b2522] rounded-full hover:bg-[#f4f2ee] transition cursor-pointer"
              title="닫기"
            >
              <span className="text-base font-bold leading-none">✕</span>
            </button>
          )}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1e3a34] text-[#f7f6f2] mb-3 shadow-xs">
            <BookOpen className="w-6 h-6 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold text-[#1b2522] tracking-tight">
            수행평가 AI 채점 도우미
          </h2>
          <p className="text-xs text-[#676e6a] mt-1">
            선생님을 위한 단아하고 신뢰할 수 있는 대면 평가 솔루션
          </p>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#f4f2ee] rounded-xl mt-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition ${
                tab === 'login'
                  ? 'bg-white text-[#1e3a34] shadow-xs font-bold'
                  : 'text-[#69726d] hover:text-[#1b2522]'
              }`}
            >
              선생님 로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition ${
                tab === 'signup'
                  ? 'bg-white text-[#1e3a34] shadow-xs font-bold'
                  : 'text-[#69726d] hover:text-[#1b2522]'
              }`}
            >
              신규 교사 등록
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-[#fdf3f2] border border-[#f5d5d3] text-[#9b2c2c] text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#c53030] shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {tab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#4a524e] mb-1">
                  학교 이메일
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8a918d] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.kr"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] placeholder-[#a6ada9] focus:bg-white focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a524e] mb-1">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8a918d] absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full text-xs pl-9 pr-9 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] placeholder-[#a6ada9] focus:bg-white focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[#8a918d] hover:text-[#4a524e] absolute right-2.5 top-2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1e3a34] hover:bg-[#162d28] active:scale-98 text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <span>{isLoading ? '인증 확인 중...' : '로그인'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* SIGNUP FORM */
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#4a524e] mb-1">
                  선생님 성함 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#8a918d] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 김서연 선생님"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-[#4a524e] mb-1">
                    소속 학교
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#8a918d] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="예: 서울동도중"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4a524e] mb-1">
                    담당 교과
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                  >
                    <option value="영어">영어과</option>
                    <option value="국어">국어과</option>
                    <option value="사회">사회/역사</option>
                    <option value="제2외국어">제2외국어</option>
                    <option value="기타">기타 교과</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a524e] mb-1">
                  학교 이메일 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8a918d] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.kr"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a524e] mb-1">
                  비밀번호 <span className="text-rose-500">*</span> (6자 이상)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8a918d] absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 설정"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#dcd8d0] rounded-xl text-[#1b2522] focus:border-[#1e3a34] focus:ring-1 focus:ring-[#1e3a34] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1e3a34] hover:bg-[#162d28] active:scale-98 text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mt-2"
              >
                <span>{isLoading ? '등록 중...' : '교사 회원가입 완료'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo One-Click Login */}
          <div className="pt-3 border-t border-[#eceae5]">
            <button
              type="button"
              onClick={handleFastDemoLogin}
              className="w-full py-2.5 px-3 bg-[#f2f6f4] hover:bg-[#e7f0ec] text-[#1e3a34] border border-[#d1e2da] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2c534b]" />
              <span>체험용 교사 계정으로 바로 시작 (김서연 선생님)</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-[#f6f4ef] border-t border-[#eae7e1] text-center text-[11px] text-[#787f7b] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2c534b]" />
          <span>교원 전용 보안 환경 • 학생 개인정보 암호화 보관</span>
        </div>
      </div>
    </div>
  );
};
