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
  Mic,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { TeacherUser } from '../types';
import {
  registerTeacher,
  authenticateTeacher,
  DEMO_TEACHER,
  saveCurrentTeacher,
} from '../utils/storage';

interface TeacherAuthViewProps {
  onSuccess: (teacher: TeacherUser) => void;
}

export const TeacherAuthView: React.FC<TeacherAuthViewProps> = ({ onSuccess }) => {
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const user = authenticateTeacher(email.trim(), password);
      onSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
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
      setErrorMsg('올바른 학교 또는 업무용 이메일 주소를 입력해 주세요.');
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
          school: school.trim() || '서울동도중학교',
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
    <div className="min-h-screen w-full bg-[#faf8f5] flex flex-col justify-between text-[#1c2623] px-4 py-8 sm:py-12 selection:bg-[#d8e8e1]">
      <div className="max-w-4xl w-full mx-auto space-y-8 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1b3831] text-[#f7f6f2] shadow-xs mb-1">
            <BookOpen className="w-7 h-7 stroke-[1.75]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#142823]">
            수행평가 AI 채점 도우미
          </h1>
          <p className="text-sm sm:text-base text-[#525f5a] max-w-lg mx-auto leading-relaxed">
            선생님의 스마트폰이나 태블릿으로 학생을 1:1로 불러 바로 녹음하고,<br className="hidden sm:inline" />
            AI 초안과 근거 구간을 확인하여 믿을 수 있게 최종 승인합니다.
          </p>
        </div>

        {/* Core Philosophy Feature Pills (3 Principles) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          <div className="bg-white border border-[#eae5da] p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eaf1ed] text-[#1b3831] flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#142823]">1:1 현장 대면 녹음</div>
              <div className="text-[11px] text-[#63706b]">선생님 폰·패드로 바로 채점</div>
            </div>
          </div>

          <div className="bg-white border border-[#eae5da] p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eaf1ed] text-[#1b3831] flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#142823]">교사 최종 승인제</div>
              <div className="text-[11px] text-[#63706b]">AI는 초안만, 교사가 확정</div>
            </div>
          </div>

          <div className="bg-white border border-[#eae5da] p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eaf1ed] text-[#1b3831] flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#142823]">모바일·패드 반응형</div>
              <div className="text-[11px] text-[#63706b]">교실 어디서든 터치 최적화</div>
            </div>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="max-w-md w-full mx-auto bg-white border border-[#e8e4db] rounded-3xl shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-[#f5f2eb] border-b border-[#eae5da] text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
              }}
              className={`py-2.5 rounded-xl transition ${
                tab === 'login'
                  ? 'bg-white text-[#1b3831] shadow-2xs'
                  : 'text-[#63706b] hover:text-[#1c2623]'
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
              className={`py-2.5 rounded-xl transition ${
                tab === 'signup'
                  ? 'bg-white text-[#1b3831] shadow-2xs'
                  : 'text-[#63706b] hover:text-[#1c2623]'
              }`}
            >
              신규 교사 가입
            </button>
          </div>

          <div className="p-6 sm:p-7 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-[#fdf3f0] border border-[#f5dcd5] text-[#a14022] text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#b44826] shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {tab === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#45504c] mb-1">
                    학교 또는 업무 이메일
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8b9893] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@school.kr"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] placeholder-[#9ea8a4] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#45504c]">
                      비밀번호
                    </label>
                    <span className="text-[11px] text-[#6b7974]">(기본: password123)</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8b9893] absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호"
                      className="w-full text-xs pl-9 pr-9 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] placeholder-[#9ea8a4] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#8b9893] hover:text-[#45504c] absolute right-2.5 top-2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#1b3831] hover:bg-[#142b26] active:scale-[0.99] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{isLoading ? '인증 확인 중...' : '선생님으로 로그인'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* SIGNUP FORM */
              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#45504c] mb-1">
                    선생님 성함 <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8b9893] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 김서연 선생님"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#45504c] mb-1">
                      소속 학교
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#8b9893] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="예: 서울동도중"
                        className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#45504c] mb-1">
                      담당 교과
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                    >
                      <option value="영어">영어과</option>
                      <option value="국어">국어과</option>
                      <option value="사회">사회/역사</option>
                      <option value="과학">과학과</option>
                      <option value="제2외국어">제2외국어</option>
                      <option value="기타">기타 교과</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#45504c] mb-1">
                    학교 이메일 <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8b9893] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@school.kr"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#45504c] mb-1">
                    비밀번호 <span className="text-rose-600">*</span> (6자 이상)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8b9893] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 설정"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-[#d8d3c7] rounded-xl text-[#1c2623] focus:border-[#1b3831] focus:ring-1 focus:ring-[#1b3831] focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#1b3831] hover:bg-[#142b26] active:scale-[0.99] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                >
                  <span>{isLoading ? '등록 중...' : '교사 회원가입 완료'}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Quick Demo One-Click Login */}
            <div className="pt-3 border-t border-[#eae5da]">
              <button
                type="button"
                onClick={handleFastDemoLogin}
                className="w-full py-2.5 px-3 bg-[#eaf1ed] hover:bg-[#ddebe4] text-[#1b3831] border border-[#cbe0d5] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1b3831]" />
                <span>체험용 교사 계정으로 1초 시작하기 (김서연 선생님)</span>
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-[#f5f2eb] border-t border-[#eae5da] text-center text-[11px] text-[#6b7974] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1b3831]" />
            <span>교원 전용 보안 환경 • 학생 음성 및 평가 데이터 암호화 보관</span>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-[#828f89] pt-6">
        수행평가 AI 채점 도우미 • 교사 승인 기반 공정 평가 플랫폼
      </footer>
    </div>
  );
};
