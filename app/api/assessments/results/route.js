import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';

export async function POST(req) {
  try {
    const user = getUserFromRequest(req);
    const body = await req.json();

    const {
      assessmentId,
      userId,
      answers = [],
      allowReattempt = false,
    } = body;

    if (!assessmentId || !Array.isArray(answers)) {
      return ApiResponse.error(
        "Assessment and answers are required",
        400
      );
    }

    const studentId = user?.userId || user?.id || userId;

    if (!studentId) {
      return ApiResponse.error("User is required", 400);
    }

    // ---------------------------------------------------
    // Assessment
    // ---------------------------------------------------

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return ApiResponse.error("Assessment not found", 404);
    }

    // ---------------------------------------------------
    // Existing Result
    // ---------------------------------------------------

    const existing = await prisma.assessmentResult.findFirst({
      where: {
        assessmentId,
        userId: studentId,
        status: true,
      },
    });

    // ---------------------------------------------------
    // Approved Reattempt (Safe)
    // ---------------------------------------------------

    let approvedRequest = null;

    if (prisma.assessmentReattemptRequest) {
      approvedRequest =
        await prisma.assessmentReattemptRequest.findFirst({
          where: {
            assessmentId,
            userId: studentId,
            status: "APPROVED",
          },
          orderBy: {
            requestedAt: "desc",
          },
        });
    }

    if (existing && !allowReattempt && !approvedRequest) {
      return ApiResponse.error(
        "You have already attempted this assessment. Request a reattempt from your teacher.",
        409
      );
    }

    // ---------------------------------------------------
    // Questions
    // ---------------------------------------------------

    const questions = await prisma.assessmentQuestion.findMany({
      where: {
        assessmentId,
        status: true,
      },
      include: {
        options: {
          where: {
            status: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    if (!questions.length) {
      return ApiResponse.error(
        "No questions found for this assessment.",
        404
      );
    }

    // ---------------------------------------------------
    // Calculate Score
    // ---------------------------------------------------

    let score = 0;
    const evaluatedAnswers = [];

    questions.forEach((question, index) => {
      const selectedOptionIndex = Number(
        answers[index]?.selectedOptionIndex
      );

      const correctOptionIndex = question.options.findIndex(
        (option) => option.isCorrect
      );

      const isCorrect =
        selectedOptionIndex === correctOptionIndex;

      if (isCorrect) score++;

      evaluatedAnswers.push({
        questionId: question.id,
        selectedOptionIndex:
          Number.isNaN(selectedOptionIndex)
            ? null
            : selectedOptionIndex,
        correctOptionIndex,
        isCorrect,
      });
    });

    // ---------------------------------------------------
    // Save Result
    // ---------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      if (existing && (allowReattempt || approvedRequest)) {
        return await tx.assessmentResult.update({
          where: {
            id: existing.id,
          },
          data: {
            score,
            totalQuestions: questions.length,

            // If "answers" is Json field, replace with:
            // answers: evaluatedAnswers,

            answers: JSON.stringify(evaluatedAnswers),
          },
        });
      }

      return await tx.assessmentResult.create({
        data: {
          assessmentId,
          userId: studentId,
          score,
          totalQuestions: questions.length,

          // If "answers" is Json field, replace with:
          // answers: evaluatedAnswers,

          answers: JSON.stringify(evaluatedAnswers),
        },
      });
    });

    return ApiResponse.success(
      {
        id: result.id,
        score,
        totalQuestions: questions.length,
        percentage:
          questions.length > 0
            ? Math.round((score / questions.length) * 100)
            : 0,
      },
      "Assessment submitted successfully"
    );
  } catch (error) {
    console.error("========== Assessment Submit Error ==========");
    console.error(error);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return ApiResponse.error(
      error.message || "Unable to submit assessment",
      500
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');

    const results = await prisma.assessmentResult.findMany({
      where: assessmentId ? { assessmentId } : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        assessment: {
          select: {
            id: true,
            title: true,
            type: true,
            subject: { select: { subjectName: true } },
            class: { select: { className: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(results);
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load results', 500, error);
  }
}
