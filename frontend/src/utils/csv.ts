import { Assessment, Submission, Grading } from '../types';

export function exportScoresToCSV(
  assessment: Assessment,
  submissions: Submission[],
  gradings: Grading[]
): void {
  // Sort submissions by student number
  const sortedSubmissions = [...submissions].sort((a, b) => {
    const numA = parseInt(a.studentNumber, 10) || 0;
    const numB = parseInt(b.studentNumber, 10) || 0;
    return numA - numB;
  });

  const criteriaHeaders = assessment.criteria.map((c) => `${c.name}(${c.maxScore}점)`);
  const headers = [
    '번호',
    '이름',
    '제출 유형',
    '제출 시각',
    '승인 여부',
    ...criteriaHeaders,
    '최종 총점',
    'AI 초안 총점',
    '확인 필요 여부',
    '교사 종합 의견',
    '생활기록부 세특 초안',
  ];

  const rows = sortedSubmissions.map((sub) => {
    const grading = gradings.find((g) => g.submissionId === sub.id);
    const isApproved = grading?.status === 'teacher_approved';
    const statusText = isApproved ? '교사 승인 완료' : '미승인';

    // Type label
    const typeLabel =
      sub.submissionType === 'speaking'
        ? '말하기(녹음)'
        : sub.submissionType === 'writing'
        ? '쓰기(글)'
        : '말하기+쓰기';

    // Criteria scores
    const criteriaScores = assessment.criteria.map((crit) => {
      if (!grading) return '-';
      if (isApproved && grading.teacherScore) {
        const found = grading.teacherScore.criteriaScores.find((cs) => cs.criterionId === crit.id);
        if (found !== undefined) return found.score.toString();
      }
      const aiFound = grading.aiScore.criteriaScores.find((cs) => cs.criterionId === crit.id);
      return aiFound !== undefined ? aiFound.score.toString() : '-';
    });

    const finalScore = isApproved
      ? grading?.finalScore !== undefined
        ? grading.finalScore.toString()
        : grading?.teacherScore?.totalScore?.toString() || '-'
      : '미승인';

    const aiTotalScore = grading?.aiScore.totalScore !== undefined ? grading.aiScore.totalScore.toString() : '-';
    const needsReview = grading?.aiScore.needsReview ? `확인 필요: ${grading.aiScore.needsReviewReason || '요망'}` : '정상';
    const teacherComment = grading?.teacherScore?.generalComment || '-';
    const schoolRecord = grading?.schoolRecordDraft ? grading.schoolRecordDraft.replace(/"/g, '""') : '-';

    return [
      `"${sub.studentNumber}"`,
      `"${sub.studentName}"`,
      `"${typeLabel}"`,
      `"${new Date(sub.submittedAt).toLocaleString('ko-KR')}"`,
      `"${statusText}"`,
      ...criteriaScores.map((s) => `"${s}"`),
      `"${finalScore}"`,
      `"${aiTotalScore}"`,
      `"${needsReview}"`,
      `"${teacherComment.replace(/"/g, '""')}"`,
      `"${schoolRecord}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${assessment.title}_수행평가_채점결과.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
