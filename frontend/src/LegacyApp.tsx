import React, { useState, useEffect } from 'react';
import {
  Assessment,
  Submission,
  Grading,
  TeacherUser,
} from './types';
import {
  getAssessments,
  saveAssessment,
  deleteAssessment,
  getSubmissions,
  saveSubmission,
  getGradings,
  saveGrading,
  seedSampleData,
  getAudioBlob,
  saveAudioBlob,
  blobToBase64,
  getCurrentTeacher,
  saveCurrentTeacher,
  clearCurrentTeacher,
  DEMO_TEACHER,
} from './utils/storage';
import { TeacherAssessmentList } from './components/TeacherAssessmentList';
import { TeacherSubmissionTable } from './components/TeacherSubmissionTable';
import { StudentGradingDetailView } from './components/StudentGradingDetailView';
import { CreateAssessmentModal } from './components/CreateAssessmentModal';
import { QRCodeModal } from './components/QRCodeModal';
import { SettingsModal } from './components/SettingsModal';
import { OnSiteRecorderModal } from './components/OnSiteRecorderModal';
import { RosterManageModal } from './components/RosterManageModal';
import { WritingInputModal } from './components/WritingInputModal';
import { StudentSubmissionFlow } from './components/StudentSubmissionFlow';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { TeacherAuthView } from './components/TeacherAuthView';
import {
  Settings,
  QrCode,
  ArrowLeft,
  RefreshCw,
  UserCheck,
  LogOut,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export default function App() {
  // Teacher Authentication state: returns null if not logged in
  const [currentTeacher, setCurrentTeacher] = useState<TeacherUser | null>(() => {
    return getCurrentTeacher();
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Primary mode
  const [viewMode, setViewMode] = useState<'teacher' | 'student_link'>('teacher');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradings, setGradings] = useState<Grading[]>([]);

  // Navigation states for Teacher
  const [activeAssessment, setActiveAssessment] = useState<Assessment | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrModalAssessment, setQrModalAssessment] = useState<Assessment | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  // 1:1 On-Site Recorder Modal
  const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);
  const [recorderStudent, setRecorderStudent] = useState<{
    studentNumber: string;
    studentName: string;
    submissionId?: string;
  } | null>(null);

  // Writing Input Modal
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [writingStudent, setWritingStudent] = useState<{
    studentNumber: string;
    studentName: string;
    submissionId?: string;
    initialText?: string;
  } | null>(null);

  // Batch AI Grading state
  const [isBatchGrading, setIsBatchGrading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; studentName?: string }>({
    current: 0,
    total: 0,
  });

  // URL query handling
  const [studentAccessCode, setStudentAccessCode] = useState('');

  const refreshData = () => {
    const asmList = getAssessments();
    const subList = getSubmissions();
    const grdList = getGradings();
    setAssessments(asmList);
    setSubmissions(subList);
    setGradings(grdList);

    if (activeAssessment) {
      const refreshedAsm = asmList.find((a) => a.id === activeAssessment.id) || null;
      setActiveAssessment(refreshedAsm);
    }
  };

  useEffect(() => {
    let asmList = getAssessments();
    if (asmList.length === 0) {
      seedSampleData().then(() => {
        refreshData();
      });
    } else {
      refreshData();
    }

    const searchParams = new URLSearchParams(window.location.search);
    const codeParam = searchParams.get('code');
    const roleParam = searchParams.get('role');
    if (codeParam) {
      setStudentAccessCode(codeParam);
      if (roleParam === 'student') {
        setViewMode('student_link');
      }
    }
  }, []);

  const handleSeedSample = async () => {
    await seedSampleData();
    refreshData();
    alert('가상 학생 4명의 채점 및 음성 데이터가 성공적으로 생성되었습니다!');
  };

  const handleSaveNewAssessment = (newAsm: Assessment) => {
    saveAssessment(newAsm);
    refreshData();
    setIsCreateModalOpen(false);
    setActiveAssessment(newAsm);
  };

  const handleDeleteAssessment = (id: string) => {
    deleteAssessment(id);
    if (activeAssessment?.id === id) {
      setActiveAssessment(null);
      setActiveSubmission(null);
    }
    refreshData();
  };

  // Add students to class roster
  const handleAddStudentsToRoster = (newStudents: { studentNumber: string; studentName: string }[]) => {
    if (!activeAssessment) return;

    newStudents.forEach((st) => {
      const existing = submissions.find(
        (s) => s.assessmentId === activeAssessment.id && s.studentNumber === st.studentNumber
      );
      if (!existing) {
        const sub: Submission = {
          id: `sub-${Date.now()}-${st.studentNumber}`,
          assessmentId: activeAssessment.id,
          studentNumber: st.studentNumber,
          studentName: st.studentName,
          submissionType: activeAssessment.submissionType,
          consentAgreed: true,
          submittedAt: new Date().toISOString(),
        };
        saveSubmission(sub);
      }
    });

    refreshData();
  };

  // 1:1 On-Site Recording completion handler
  const handleOnSiteRecordingComplete = async (audioBlob: Blob, base64: string, durationSec: number) => {
    if (!activeAssessment || !recorderStudent) return;

    let targetSubmission = submissions.find(
      (s) => s.assessmentId === activeAssessment.id && s.studentNumber === recorderStudent.studentNumber
    );

    const submissionId = targetSubmission ? targetSubmission.id : `sub-${Date.now()}`;
    const audioBlobId = `audio-${submissionId}`;

    await saveAudioBlob(audioBlobId, audioBlob);

    const updatedSub: Submission = {
      id: submissionId,
      assessmentId: activeAssessment.id,
      studentNumber: recorderStudent.studentNumber,
      studentName: recorderStudent.studentName,
      submissionType: activeAssessment.submissionType,
      audioBlobId,
      audioBase64: base64,
      audioDurationSec: durationSec,
      audioMimeType: audioBlob.type || 'audio/webm',
      consentAgreed: true,
      submittedAt: new Date().toISOString(),
    };

    saveSubmission(updatedSub);
    refreshData();

    // Trigger AI Grading immediately for this student
    try {
      await gradeSingleSubmission(updatedSub, activeAssessment);
    } catch (e) {
      console.error('AI grading error for on-site recording', e);
    }
  };

  // Writing text completion handler
  const handleWritingTextComplete = async (text: string) => {
    if (!activeAssessment || !writingStudent) return;

    let targetSubmission = submissions.find(
      (s) => s.assessmentId === activeAssessment.id && s.studentNumber === writingStudent.studentNumber
    );

    const submissionId = targetSubmission ? targetSubmission.id : `sub-${Date.now()}`;

    const updatedSub: Submission = {
      id: submissionId,
      assessmentId: activeAssessment.id,
      studentNumber: writingStudent.studentNumber,
      studentName: writingStudent.studentName,
      submissionType: activeAssessment.submissionType,
      writtenText: text,
      consentAgreed: true,
      submittedAt: new Date().toISOString(),
    };

    saveSubmission(updatedSub);
    refreshData();

    try {
      await gradeSingleSubmission(updatedSub, activeAssessment);
    } catch (e) {
      console.error('AI grading error for writing submission', e);
    }
  };

  // Single Submission AI Grading logic
  const gradeSingleSubmission = async (sub: Submission, asm: Assessment) => {
    let audioBase64 = sub.audioBase64;
    if (!audioBase64 && sub.audioBlobId) {
      const blob = await getAudioBlob(sub.audioBlobId);
      if (blob) {
        audioBase64 = await blobToBase64(blob);
      }
    }

    let endpoint = '/api/grade/speaking';
    let body: any = {
      assessment: asm,
      studentName: sub.studentName,
    };

    if (sub.submissionType === 'writing') {
      endpoint = '/api/grade/writing';
      body.writtenText = sub.writtenText;
    } else if (sub.submissionType === 'both') {
      endpoint = '/api/grade/both';
      body.audioBase64 = audioBase64;
      body.mimeType = sub.audioMimeType || 'audio/webm';
      body.writtenText = sub.writtenText;
    } else {
      endpoint = '/api/grade/speaking';
      body.audioBase64 = audioBase64;
      body.mimeType = sub.audioMimeType || 'audio/webm';
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const criteriaScores = data.criteria || [];
    const totalScore = criteriaScores.reduce((sum: number, c: any) => sum + (c.score || 0), 0);

    const gradingId = `grading-${sub.id}`;
    const newGrading: Grading = {
      id: gradingId,
      submissionId: sub.id,
      assessmentId: asm.id,
      status: 'ai_graded',
      transcriptSentences: data.transcript,
      writingSentences: data.sentences,
      aiScore: {
        totalScore,
        criteriaScores,
        fillersCount: data.fillers || 0,
        confidence: data.overall_confidence || '높음',
        confidenceReason: data.confidence_reason || '성취기준에 근거하여 AI 초안 산출 완료',
        needsReview: !!data.needsReview,
        needsReviewReason: data.needsReviewReason,
      },
      metrics: data.metrics,
      changeLogs: [
        {
          timestamp: new Date().toISOString(),
          type: 'ai_generated',
          summary: `AI 채점 초안 자동 생성 (총점 ${totalScore.toFixed(1)}점, 신뢰도 ${data.overall_confidence || '높음'})`,
          actor: 'AI 채점 시스템',
        },
      ],
    };

    saveGrading(newGrading);
    refreshData();
    return newGrading;
  };

  // Batch AI Grading
  const handleBatchAIGrade = async () => {
    if (!activeAssessment) return;
    const currentSubmissions = submissions.filter((s) => s.assessmentId === activeAssessment.id);
    if (currentSubmissions.length === 0) return;

    setIsBatchGrading(true);
    setBatchProgress({ current: 0, total: currentSubmissions.length });

    for (let i = 0; i < currentSubmissions.length; i++) {
      const sub = currentSubmissions[i];
      setBatchProgress({
        current: i,
        total: currentSubmissions.length,
        studentName: `${sub.studentNumber}번 ${sub.studentName}`,
      });

      try {
        await gradeSingleSubmission(sub, activeAssessment);
      } catch (err) {
        console.error(`Batch grade error for student ${sub.studentName}:`, err);
      }
    }

    setBatchProgress({
      current: currentSubmissions.length,
      total: currentSubmissions.length,
      studentName: '모든 학생 분석 완료',
    });
    setIsBatchGrading(false);
  };

  const handleUpdateGrading = (updatedGrading: Grading) => {
    saveGrading(updatedGrading);
    refreshData();
  };

  // Logout handler
  const handleLogout = () => {
    clearCurrentTeacher();
    setCurrentTeacher(null);
  };

  // If not logged in as teacher, display the serene, full Teacher Login / Sign-up view
  if (!currentTeacher && viewMode !== 'student_link') {
    return (
      <TeacherAuthView
        onSuccess={(teacher) => {
          saveCurrentTeacher(teacher);
          setCurrentTeacher(teacher);
        }}
      />
    );
  }

  // Student Direct Submit view (only if accessed via student link)
  if (viewMode === 'student_link') {
    return (
      <StudentSubmissionFlow
        initialCode={studentAccessCode}
        assessments={assessments}
        onSubmit={(sub) => {
          saveSubmission(sub);
          refreshData();
        }}
        onSwitchToTeacher={() => setViewMode('teacher')}
      />
    );
  }

  // Primary Teacher App Layout (Serene, Clean Korean Aesthetic)
  return (
    <div className="flex flex-col h-screen w-full bg-[#fbfbfa] text-[#1b2522] overflow-hidden font-sans">
      {/* Global Teacher Header Bar - on mobile, hidden when an assessment/student is active to prevent double-stacked headers */}
      <header className={`bg-white border-b border-[#eae5da] px-4 sm:px-6 py-2.5 items-center justify-between shrink-0 shadow-2xs z-20 ${
        activeAssessment ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setActiveAssessment(null);
              setActiveSubmission(null);
            }}
            className="flex items-center gap-2.5 hover:opacity-85 transition text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1b3831] text-[#f7f6f2] flex items-center justify-center font-bold text-xs shadow-xs">
              <BookOpen className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#142823] tracking-tight block">
                수행평가 AI 채점 도우미
              </span>
            </div>
          </button>

          {activeAssessment && (
            <div className="flex items-center gap-1.5 text-xs text-[#7c8a84] ml-2 pl-3 border-l border-[#eae5da]">
              <button
                onClick={() => {
                  setActiveSubmission(null);
                }}
                className="hover:text-[#1b3831] font-medium truncate max-w-[140px] sm:max-w-xs cursor-pointer"
              >
                {activeAssessment.title}
              </button>
              {activeSubmission && (
                <>
                  <span className="text-[#c0bcb5]">/</span>
                  <span className="text-[#1b2522] font-bold">
                    {activeSubmission.studentNumber}번 {activeSubmission.studentName}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Global Toolbar & Teacher Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {activeAssessment && (
            <button
              onClick={() => {
                setQrModalAssessment(activeAssessment);
                setIsQRModalOpen(true);
              }}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#4a524e] hover:text-[#1b2522] bg-[#f7f6f2] hover:bg-[#eeebe4] border border-[#dcd8d0] rounded-xl transition"
              title="학생용 제출 코드 / QR 보기"
            >
              <QrCode className="w-3.5 h-3.5 text-[#2c534b]" />
              <span>제출 코드 ({activeAssessment.code})</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#525a55] hover:text-[#1b2522] hover:bg-[#f2efe9] rounded-xl transition"
            title="데이터 및 환경 설정"
          >
            <Settings className="w-4 h-4 text-[#737c77]" />
            <span className="hidden sm:inline">설정</span>
          </button>

          {/* Teacher Profile / Login Badge */}
          {currentTeacher ? (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#e8e6e1]">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f2f6f4] hover:bg-[#e7f0ec] border border-[#d1e2da] rounded-xl text-xs transition"
                title="계정 정보 확인 및 변경"
              >
                <div className="w-5 h-5 rounded-full bg-[#1e3a34] text-[#f7f6f2] flex items-center justify-center font-bold text-[10px]">
                  {currentTeacher.name[0]}
                </div>
                <div className="text-left hidden md:block">
                  <span className="font-bold text-[#1e3a34] block leading-none">
                    {currentTeacher.name} 선생님
                  </span>
                  <span className="text-[10px] text-[#55756c] font-normal leading-tight">
                    {currentTeacher.school} {currentTeacher.subject}
                  </span>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 text-[#8a918d] hover:text-[#9b2c2c] hover:bg-[#fdf2f2] rounded-xl transition"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-[#1e3a34] hover:bg-[#162d28] text-[#f7f6f2] text-xs font-bold rounded-xl shadow-xs transition"
            >
              선생님 로그인
            </button>
          )}
        </div>
      </header>

      {/* Main View Router */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeSubmission && activeAssessment ? (
          // View 3: Student Grading Detail
          <StudentGradingDetailView
            assessment={activeAssessment}
            submission={activeSubmission}
            grading={
              gradings.find((g) => g.submissionId === activeSubmission.id) || {
                id: `grading-${activeSubmission.id}`,
                submissionId: activeSubmission.id,
                assessmentId: activeAssessment.id,
                status: 'submitted',
                aiScore: {
                  totalScore: 0,
                  criteriaScores: [],
                  confidence: '보통',
                  confidenceReason: '채점 대기 중',
                  needsReview: false,
                },
                changeLogs: [],
              }
            }
            allSubmissions={submissions.filter((s) => s.assessmentId === activeAssessment.id)}
            onBack={() => setActiveSubmission(null)}
            onSelectStudent={(sub) => setActiveSubmission(sub)}
            onUpdateGrading={handleUpdateGrading}
            onReRecord={(st) => {
              setRecorderStudent(st);
              setIsRecorderModalOpen(true);
            }}
          />
        ) : activeAssessment ? (
          // View 2: Submissions Table & On-Site Evaluation Workspace
          <TeacherSubmissionTable
            assessment={activeAssessment}
            submissions={submissions.filter((s) => s.assessmentId === activeAssessment.id)}
            gradings={gradings.filter((g) => g.assessmentId === activeAssessment.id)}
            onBack={() => setActiveAssessment(null)}
            onOpenGradingDetail={(sub) => setActiveSubmission(sub)}
            onBatchAIGrade={handleBatchAIGrade}
            isBatchGrading={isBatchGrading}
            batchProgress={batchProgress}
            onShowQRModal={() => {
              setQrModalAssessment(activeAssessment);
              setIsQRModalOpen(true);
            }}
            onOpenOnSiteRecorder={(st) => {
              setRecorderStudent(st);
              setIsRecorderModalOpen(true);
            }}
            onOpenWritingInput={(st) => {
              setWritingStudent(st);
              setIsWritingModalOpen(true);
            }}
            onOpenRosterModal={() => setIsRosterModalOpen(true)}
          />
        ) : (
          // View 1: Assessment List
          <TeacherAssessmentList
            assessments={assessments}
            submissions={submissions}
            gradings={gradings}
            onSelectAssessment={(asm) => setActiveAssessment(asm)}
            onCreateNew={() => setIsCreateModalOpen(true)}
            onOpenQR={(asm) => {
              setQrModalAssessment(asm);
              setIsQRModalOpen(true);
            }}
            onDeleteAssessment={handleDeleteAssessment}
            onSeedSampleData={handleSeedSample}
          />
        )}
      </div>

      {/* Teacher Login / Signup Modal */}
      {isAuthModalOpen && (
        <TeacherAuthModal
          isOpen={isAuthModalOpen}
          canDismiss={true}
          onSuccess={(user) => {
            setCurrentTeacher(user);
            setIsAuthModalOpen(false);
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* 1:1 On-Site Recorder Modal for Teacher Device */}
      {isRecorderModalOpen && activeAssessment && recorderStudent && (
        <OnSiteRecorderModal
          isOpen={isRecorderModalOpen}
          onClose={() => setIsRecorderModalOpen(false)}
          assessment={activeAssessment}
          student={recorderStudent}
          onRecordingComplete={handleOnSiteRecordingComplete}
        />
      )}

      {/* Writing Input Modal for Teacher Device */}
      {isWritingModalOpen && activeAssessment && writingStudent && (
        <WritingInputModal
          isOpen={isWritingModalOpen}
          onClose={() => setIsWritingModalOpen(false)}
          assessment={activeAssessment}
          student={writingStudent}
          initialText={writingStudent.initialText}
          onSubmitText={handleWritingTextComplete}
        />
      )}

      {/* Roster Management Modal */}
      {isRosterModalOpen && activeAssessment && (
        <RosterManageModal
          isOpen={isRosterModalOpen}
          onClose={() => setIsRosterModalOpen(false)}
          assessment={activeAssessment}
          existingSubmissions={submissions.filter((s) => s.assessmentId === activeAssessment.id)}
          onAddStudents={handleAddStudentsToRoster}
        />
      )}

      {/* Create Assessment Modal */}
      <CreateAssessmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewAssessment}
      />

      {/* QR Code Modal */}
      {qrModalAssessment && (
        <QRCodeModal
          assessment={qrModalAssessment}
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          onSwitchToStudentView={() => {
            setStudentAccessCode(qrModalAssessment.code);
            setViewMode('student_link');
          }}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentAssessment={activeAssessment}
        onDataCleared={refreshData}
        onSeedSample={handleSeedSample}
      />

      {/* Teacher Profile / Auth Switch Modal */}
      {isAuthModalOpen && (
        <TeacherAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          canDismiss={true}
          onSuccess={(teacher) => {
            saveCurrentTeacher(teacher);
            setCurrentTeacher(teacher);
            setIsAuthModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
