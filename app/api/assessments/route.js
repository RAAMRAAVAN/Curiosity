import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';

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
        questionText: question.questionText?.trim(),
        displayOrder: questionIndex + 1,
        status: true,
      },
    });

    for (const [optionIndex, option] of (question.options || []).entries()) {
      await tx.assessmentOption.create({
        data: {
          questionId: createdQuestion.id,
          optionText: option.optionText?.trim(),
          isCorrect: Boolean(option.isCorrect),
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
        questionText: question.questionText?.trim(),
        displayOrder: questionIndex + 1,
        status: true,
      },
    });

    for (const [optionIndex, option] of (question.options || []).entries()) {
      await tx.assessmentOption.create({
        data: {
          questionId: createdQuestion.id,
          optionText: option.optionText?.trim(),
          isCorrect: Boolean(option.isCorrect),
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
    const { classId, subjectId, chapterId, title, description, type, questions } = body;

    if (!classId) {
      return ApiResponse.error('Class ID is required', 400);
    }

    if (!title?.trim()) {
      return ApiResponse.error('Assessment title is required', 400);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return ApiResponse.error('At least one question is required', 400);
    }

    const classExists = await prisma.class.findUnique({ where: { id: classId } });
    if (!classExists) {
      return ApiResponse.error('Class not found', 404);
    }

    if (subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return ApiResponse.error('Subject not found', 404);
      }
      if (subject.classId !== classId) {
        return ApiResponse.error('Subject does not belong to the provided class', 400);
      }
    }

    if (chapterId) {
      const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
      if (!chapter) {
        return ApiResponse.error('Chapter not found', 404);
      }
      if (subjectId && chapter.subjectId !== subjectId) {
        return ApiResponse.error('Chapter does not belong to the provided subject', 400);
      }
    }

    const assessment = await prisma.$transaction(async (tx) =>
      createAssessmentWithQuestions(tx, {
        classId,
        subjectId,
        chapterId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        questions,
      })
    );

    return ApiResponse.success(assessment, 'Assessment created successfully');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to create assessment', 500, error);
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { assessmentId, classId, subjectId, chapterId, title, description, type, questions } = body;

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    if (!classId) {
      return ApiResponse.error('Class ID is required', 400);
    }

    if (!title?.trim()) {
      return ApiResponse.error('Assessment title is required', 400);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return ApiResponse.error('At least one question is required', 400);
    }

    const existingAssessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, classId, status: true },
    });

    if (!existingAssessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    if (subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subject) {
        return ApiResponse.error('Subject not found', 404);
      }
      if (subject.classId !== classId) {
        return ApiResponse.error('Subject does not belong to the provided class', 400);
      }
    }

    if (chapterId) {
      const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
      if (!chapter) {
        return ApiResponse.error('Chapter not found', 404);
      }
      if (subjectId && chapter.subjectId !== subjectId) {
        return ApiResponse.error('Chapter does not belong to the provided subject', 400);
      }
    }

    const assessment = await prisma.$transaction(async (tx) =>
      updateAssessmentWithQuestions(tx, assessmentId, {
        classId,
        subjectId,
        chapterId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        questions,
      })
    );

    return ApiResponse.success(assessment, 'Assessment updated successfully');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to update assessment', 500, error);
  }
}
