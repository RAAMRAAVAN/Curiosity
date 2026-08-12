import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { createAssessmentQuestionRecord, createAssessmentRecord, ensureAssessmentSchemaColumns, updateAssessmentRecord } from '@/lib/assessmentCompatibility';
import { recalculateAssessmentResults } from '@/lib/assessmentRegrading';
import { updateAssessmentOperationStatus } from '@/lib/assessmentUpdateStatus';
import { requireAdminPermission } from '@/lib/adminRbac';

const safeUpdateOperationStatus = async (operationId, payload) => {
  try {
    await updateAssessmentOperationStatus(operationId, payload);
  } catch (error) {
    console.error('Unable to persist assessment update status:', error?.message || error);
  }
};

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('At least one question is required');
  }

  return questions.map((question, questionIndex) => {
    const questionText = String(question?.questionText || '').trim();
    if (!questionText) {
      throw new Error(`Question ${questionIndex + 1} text is required`);
    }

    const marks = Number(question?.marks ?? question?.mark ?? 1);
    if (!Number.isFinite(marks) || marks < 0) {
      throw new Error(`Question ${questionIndex + 1} marks must be a positive number`);
    }

    const options = Array.isArray(question.options) ? question.options.map((option) => ({
      optionText: String(option?.optionText || '').trim(),
      isCorrect: Boolean(option?.isCorrect),
    })) : [];

    if (options.length !== 4) {
      throw new Error(`Question ${questionIndex + 1} must have exactly 4 options`);
    }

    if (options.some((option) => !option.optionText)) {
      throw new Error(`All options are required for question ${questionIndex + 1}`);
    }

    const correctOptionCount = options.filter((option) => option.isCorrect).length;
    if (correctOptionCount !== 1) {
      throw new Error(`Question ${questionIndex + 1} must have exactly one correct option`);
    }

    return {
      id: typeof question?.id === 'string' ? question.id : null,
      questionText,
      marks: Math.max(0, marks),
      options,
    };
  });
};

const validateClassSubjectChapter = async ({ classId, subjectId, chapterId }) => {
  let resolvedSubjectId = subjectId || null;
  const classExists = await prisma.class.findUnique({ where: { id: classId } });
  if (!classExists) {
    throw { status: 404, message: 'Class not found' };
  }

  if (subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      throw { status: 404, message: 'Subject not found' };
    }
    if (subject.classId !== classId) {
      throw { status: 400, message: 'Subject does not belong to the provided class' };
    }
    resolvedSubjectId = subjectId;
  }

  if (chapterId) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { subject: true },
    });
    if (!chapter) {
      throw { status: 404, message: 'Chapter not found' };
    }
    if (!chapter.subject) {
      throw { status: 404, message: 'Chapter subject not found' };
    }
    if (chapter.subject.classId !== classId) {
      throw { status: 400, message: 'Chapter does not belong to the provided class' };
    }
    if (subjectId && chapter.subjectId !== subjectId) {
      throw { status: 400, message: 'Chapter does not belong to the provided subject' };
    }
    if (!resolvedSubjectId) {
      resolvedSubjectId = chapter.subjectId;
    }
  }

  return resolvedSubjectId;
};

const createAssessmentWithQuestions = async (tx, data) => {
  const createdAssessment = await createAssessmentRecord(tx, data);

  for (const [questionIndex, question] of data.questions.entries()) {
    const createdQuestion = await createAssessmentQuestionRecord(tx, {
      assessmentId: createdAssessment.id,
      questionText: question.questionText,
      marks: question.marks ?? 1,
      displayOrder: questionIndex + 1,
    });

    for (const [optionIndex, option] of question.options.entries()) {
      await tx.assessmentOption.create({
        data: {
          questionId: createdQuestion.id,
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          displayOrder: optionIndex + 1,
          status: true,
        },
      });
    }
  }

  return tx.assessment.findUniqueOrThrow({
    where: { id: createdAssessment.id },
    include: {
      questions: {
        where: { status: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          options: {
            where: { status: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
  });
};

const updateAssessmentWithQuestions = async (tx, assessmentId, data) => {
  await updateAssessmentRecord(tx, assessmentId, data);

  const existingQuestions = await tx.assessmentQuestion.findMany({
    where: { assessmentId },
    select: { id: true },
  });
  const existingQuestionIds = new Set(existingQuestions.map((question) => question.id));
  const retainedQuestionIds = [];

  for (const [questionIndex, question] of data.questions.entries()) {
    let questionId = null;
    const canReuseQuestion = typeof question.id === 'string' && existingQuestionIds.has(question.id);

    if (canReuseQuestion) {
      await tx.assessmentQuestion.update({
        where: { id: question.id },
        data: {
          questionText: question.questionText,
          marks: question.marks ?? 1,
          displayOrder: questionIndex + 1,
          status: true,
        },
      });
      questionId = question.id;
    } else {
      const createdQuestion = await createAssessmentQuestionRecord(tx, {
        assessmentId,
        questionText: question.questionText,
        marks: question.marks ?? 1,
        displayOrder: questionIndex + 1,
      });
      questionId = createdQuestion.id;
    }

    retainedQuestionIds.push(questionId);
    await tx.assessmentOption.deleteMany({ where: { questionId } });

    for (const [optionIndex, option] of question.options.entries()) {
      await tx.assessmentOption.create({
        data: {
          questionId,
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          displayOrder: optionIndex + 1,
          status: true,
        },
      });
    }
  }

  await tx.assessmentQuestion.deleteMany({
    where: {
      assessmentId,
      id: {
        notIn: retainedQuestionIds,
      },
    },
  });

  return tx.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: {
      questions: {
        where: { status: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          options: {
            where: { status: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      },
    },
  });
};

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'assessments.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const body = await req.json();

    const {
      classId,
      subjectId: rawSubjectId,
      chapterId,
      title,
      description,
      type,
      questions,
      totalMarks,
      gradeBands,
    } = body;

    const subjectId = rawSubjectId || null;

    if (!classId) {
      return ApiResponse.error("Class ID is required", 400);
    }

    if (!title?.trim()) {
      return ApiResponse.error("Assessment title is required", 400);
    }

    let normalizedQuestions;
    try {
      normalizedQuestions = normalizeQuestions(questions);
    } catch (error) {
      return ApiResponse.error(error.message, 400);
    }

    // Validate Class / Subject / Chapter
    let finalSubjectId;
    try {
      finalSubjectId = await validateClassSubjectChapter({
        classId,
        subjectId,
        chapterId,
      });
    } catch (error) {
      return ApiResponse.error(error.message, error.status || 400);
    }

    const derivedTotalMarks = normalizedQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);

    const assessment = await prisma.$transaction(async (tx) => {
      return await createAssessmentWithQuestions(tx, {
        classId,
        subjectId: finalSubjectId,
        chapterId: chapterId || null,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        totalMarks: Number(totalMarks) || derivedTotalMarks,
        gradeBands: typeof gradeBands === 'string' ? gradeBands : JSON.stringify(gradeBands || []),
        questions: normalizedQuestions,
      });
    });

    return ApiResponse.success(
      assessment,
      "Assessment created successfully"
    );
  } catch (error) {
    console.error("POST Assessment Error:", error);
    return ApiResponse.error(
      error.message || "Unable to create assessment",
      500
    );
  }
}

export async function PUT(req) {
  const auth = await requireAdminPermission(req, 'assessments.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  let operationId = null;
  try {
    const body = await req.json();
    const { assessmentId, classId, subjectId: rawSubjectId, chapterId, title, description, type, questions, totalMarks, gradeBands, operationId: incomingOperationId } = body;
    operationId = incomingOperationId || null;
    const subjectId = rawSubjectId || null;

    await safeUpdateOperationStatus(operationId, {
      state: 'IN_PROGRESS',
      stage: 'VALIDATING_REQUEST',
      message: 'Validating assessment update request...',
    });

    await ensureAssessmentSchemaColumns(prisma);

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    if (!classId) {
      return ApiResponse.error('Class ID is required', 400);
    }

    if (!title?.trim()) {
      return ApiResponse.error('Assessment title is required', 400);
    }

    let normalizedQuestions;
    try {
      normalizedQuestions = normalizeQuestions(questions);
    } catch (error) {
      return ApiResponse.error(error.message, 400);
    }

    const existingAssessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, classId, status: true },
    });

    if (!existingAssessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    let resolvedSubjectId;
    try {
      resolvedSubjectId = await validateClassSubjectChapter({ classId, subjectId, chapterId });
    } catch (error) {
      return ApiResponse.error(error.message, error.status || 400);
    }

    const derivedTotalMarks = normalizedQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);

    await safeUpdateOperationStatus(operationId, {
      state: 'IN_PROGRESS',
      stage: 'UPDATING_ASSESSMENT',
      message: 'Updating assessment structure and questions...',
    });

    const assessment = await prisma.$transaction(async (tx) => {
      return updateAssessmentWithQuestions(tx, assessmentId, {
        classId,
        subjectId: resolvedSubjectId,
        chapterId: chapterId || null,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        totalMarks: Number(totalMarks) || derivedTotalMarks,
        gradeBands: typeof gradeBands === 'string' ? gradeBands : JSON.stringify(gradeBands || []),
        questions: normalizedQuestions,
      });
    }, {
      timeout: 60000,
      maxWait: 10000,
    });

    await safeUpdateOperationStatus(operationId, {
      state: 'IN_PROGRESS',
      stage: 'RECALCULATING_RESULTS',
      message: 'Recalculating submitted results for all students and centers...',
    });

    const recalculatedResults = await recalculateAssessmentResults(prisma, {
      assessmentId,
      questions: assessment.questions || [],
      totalMarks: assessment.totalMarks,
      gradeBands: assessment.gradeBands,
      batchSize: 25,
      onProgress: async ({ total, processed, batches, batchIndex }) => {
        await safeUpdateOperationStatus(operationId, {
          state: 'IN_PROGRESS',
          stage: 'RECALCULATING_RESULTS',
          message: `Recalculated ${processed}/${total} attempts (batch ${batchIndex}/${batches}).`,
          progress: {
            total,
            processed,
            batches,
            batchIndex,
          },
        });
      },
    });

    await safeUpdateOperationStatus(operationId, {
      state: 'COMPLETED',
      stage: 'DONE',
      message: `Assessment updated and ${recalculatedResults} results recalculated successfully.`,
      progress: {
        total: recalculatedResults,
        processed: recalculatedResults,
      },
      finishedAt: new Date().toISOString(),
    });

    return ApiResponse.success(
      {
        ...assessment,
        recalculatedResults,
      },
      'Assessment updated successfully'
    );
  } catch (error) {
    console.error(error);
    await safeUpdateOperationStatus(operationId, {
      state: 'FAILED',
      stage: 'FAILED',
      message: error?.message || 'Unable to update assessment',
      finishedAt: new Date().toISOString(),
    });
    return ApiResponse.error('Unable to update assessment', 500, error);
  }
}
