import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('At least one question is required');
  }

  return questions.map((question, questionIndex) => {
    const questionText = String(question?.questionText || '').trim();
    if (!questionText) {
      throw new Error(`Question ${questionIndex + 1} text is required`);
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
      questionText,
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
  const createdAssessment = await tx.assessment.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'ASSESSMENT',
      classId: data.classId,
      subjectId: data.subjectId || null,
      chapterId: data.chapterId || null,
    },
  });

  for (const [questionIndex, question] of data.questions.entries()) {
    const createdQuestion = await tx.assessmentQuestion.create({
      data: {
        assessmentId: createdAssessment.id,
        questionText: question.questionText,
        displayOrder: questionIndex + 1,
        status: true,
      },
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
  await tx.assessmentQuestion.deleteMany({ where: { assessmentId } });

  await tx.assessment.update({
    where: { id: assessmentId },
    data: {
      title: data.title,
      description: data.description,
      type: data.type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'ASSESSMENT',
      classId: data.classId,
      subjectId: data.subjectId || null,
      chapterId: data.chapterId || null,
    },
  });

  for (const [questionIndex, question] of data.questions.entries()) {
    const createdQuestion = await tx.assessmentQuestion.create({
      data: {
        assessmentId,
        questionText: question.questionText,
        displayOrder: questionIndex + 1,
        status: true,
      },
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

    const assessment = await prisma.$transaction(async (tx) => {
      return await createAssessmentWithQuestions(tx, {
        classId,
        subjectId: finalSubjectId,
        chapterId: chapterId || null,
        title: title.trim(),
        description: description?.trim() || null,
        type,
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
  try {
    const body = await req.json();
    const { assessmentId, classId, subjectId: rawSubjectId, chapterId, title, description, type, questions } = body;
    const subjectId = rawSubjectId || null;

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

    const assessment = await prisma.$transaction(async (tx) =>
      updateAssessmentWithQuestions(tx, assessmentId, {
        classId,
        subjectId: resolvedSubjectId,
        chapterId: chapterId || null,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        questions: normalizedQuestions,
      })
    );

    return ApiResponse.success(assessment, 'Assessment updated successfully');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to update assessment', 500, error);
  }
}
