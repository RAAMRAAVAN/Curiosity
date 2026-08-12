import { updateAssessmentResultRecord } from '@/lib/assessmentCompatibility';
import { calculateGradeFromPercentage, DEFAULT_GRADE_BANDS } from '@/lib/assessmentGrading';

const parseGradeBands = (gradeBands) => {
  if (Array.isArray(gradeBands) && gradeBands.length) {
    return gradeBands;
  }

  if (typeof gradeBands === 'string') {
    try {
      const parsed = JSON.parse(gradeBands);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch {
      return DEFAULT_GRADE_BANDS;
    }
  }

  return DEFAULT_GRADE_BANDS;
};

const parseStoredAnswers = (answers) => {
  if (!answers) return [];

  if (Array.isArray(answers)) {
    return answers;
  }

  if (typeof answers === 'string') {
    try {
      const parsed = JSON.parse(answers);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const recalculateAssessmentResults = async (prismaClient, {
  assessmentId,
  questions = [],
  totalMarks = 0,
  gradeBands = null,
  batchSize = 25,
  onProgress = null,
}) => {
  const existingResults = await prismaClient.assessmentResult.findMany({
    where: {
      assessmentId,
      status: true,
    },
    select: {
      id: true,
      answers: true,
    },
  });

  if (!existingResults.length) {
    if (typeof onProgress === 'function') {
      await onProgress({
        total: 0,
        processed: 0,
        batches: 0,
        batchIndex: 0,
      });
    }
    return 0;
  }

  const resolvedTotalMarks = Number(totalMarks) || questions.reduce((sum, question) => sum + (Number(question?.marks) || 0), 0);
  const resolvedGradeBands = parseGradeBands(gradeBands);
  const total = existingResults.length;
  const safeBatchSize = Math.max(1, Number(batchSize) || 25);
  const totalBatches = Math.ceil(total / safeBatchSize);
  let processed = 0;

  for (let startIndex = 0; startIndex < existingResults.length; startIndex += safeBatchSize) {
    const batch = existingResults.slice(startIndex, startIndex + safeBatchSize);

    await prismaClient.$transaction(async (tx) => {
      for (const result of batch) {
        const previousAnswers = parseStoredAnswers(result.answers);
        let score = 0;
        const evaluatedAnswers = [];

        questions.forEach((question, index) => {
          const matchingAnswerByQuestionId = previousAnswers.find((answer) => answer?.questionId === question.id);
          const fallbackAnswerByIndex = previousAnswers[index];
          const answer = matchingAnswerByQuestionId || fallbackAnswerByIndex || null;

          const selectedOptionIndex = Number(answer?.selectedOptionIndex);
          const correctOptionIndex = question.options.findIndex((option) => option.isCorrect);
          const isCorrect = Number.isFinite(selectedOptionIndex) && selectedOptionIndex === correctOptionIndex;
          const marks = Number(question?.marks ?? 1) || 0;

          if (isCorrect) {
            score += marks;
          }

          evaluatedAnswers.push({
            questionId: question.id,
            selectedOptionIndex: Number.isFinite(selectedOptionIndex) ? selectedOptionIndex : null,
            correctOptionIndex,
            isCorrect,
            marks,
          });
        });

        const percentage = resolvedTotalMarks > 0 ? Math.round((score / resolvedTotalMarks) * 100) : 0;
        const gradeResult = calculateGradeFromPercentage(percentage, resolvedGradeBands);

        await updateAssessmentResultRecord(tx, result.id, {
          score,
          totalQuestions: questions.length,
          totalMarks: resolvedTotalMarks,
          percentage,
          grade: gradeResult.grade,
          answers: JSON.stringify(evaluatedAnswers),
        });
      }
    }, {
      timeout: 60000,
      maxWait: 10000,
    });

    processed += batch.length;
    if (typeof onProgress === 'function') {
      await onProgress({
        total,
        processed,
        batches: totalBatches,
        batchIndex: Math.floor(startIndex / safeBatchSize) + 1,
      });
    }
  }

  return existingResults.length;
};