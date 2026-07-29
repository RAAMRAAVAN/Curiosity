import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';

const buildAssessmentWithStats = async (assessment, subjectId) => {
  const [attempts, eligibleStudents] = await Promise.all([
    prisma.assessmentResult.count({
      where: { assessmentId: assessment.id, status: true },
    }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        status: true,
        OR: [
          { subjectAccesses: { some: { subjectId, status: true } } },
          { classAccesses: { some: { classId: assessment.classId, status: true } } },
        ],
      },
    }),
  ]);

  return {
    ...assessment,
    attempts,
    pending: Math.max(eligibleStudents - attempts, 0),
  };
};

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId: id,
        status: true,
      },
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
      orderBy: { createdAt: 'desc' },
    });

    const assessmentsWithStats = await Promise.all(
      assessments.map((assessment) => buildAssessmentWithStats(assessment, id))
    );

    return ApiResponse.success(assessmentsWithStats);
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load assessments', 500, error);
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { title, description, type, questions } = body;

    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
    }

    if (!title?.trim()) {
      return ApiResponse.error('Assessment title is required', 400);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return ApiResponse.error('At least one question is required', 400);
    }

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      return ApiResponse.error('Subject not found', 404);
    }

    const assessment = await prisma.$transaction(async (tx) => {
      const createdAssessment = await tx.assessment.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          type: type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'ASSESSMENT',
          classId: subject.classId,
          subjectId: id,
        },
      });

      for (const [questionIndex, question] of questions.entries()) {
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
    });

    return ApiResponse.success(assessment, 'Assessment created successfully');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to create assessment', 500, error);
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { assessmentId, title, description, type, questions } = body;

    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
    }

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
    }

    if (!title?.trim()) {
      return ApiResponse.error('Assessment title is required', 400);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return ApiResponse.error('At least one question is required', 400);
    }

    const existingAssessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, subjectId: id, status: true },
    });

    if (!existingAssessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    const assessment = await prisma.$transaction(async (tx) => {
      await tx.assessmentQuestion.deleteMany({ where: { assessmentId } });

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          type: type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'ASSESSMENT',
        },
      });

      for (const [questionIndex, question] of questions.entries()) {
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
    });

    return ApiResponse.success(assessment, 'Assessment updated successfully');
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to update assessment', 500, error);
  }
}
