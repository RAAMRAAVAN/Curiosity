import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { recalculateAssessmentResults } from '@/lib/assessmentRegrading';
import { ensureAssessmentSchemaColumns } from '@/lib/assessmentCompatibility';
import { updateAssessmentOperationStatus } from '@/lib/assessmentUpdateStatus';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getUserFromRequest } from '@/server/auth';
import { teacherCanAccessSubject, teacherCanAccessAssessment } from '@/lib/teacherAssessmentAccess';

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

    const options = Array.isArray(question.options)
      ? question.options.map((option) => ({
          optionText: String(option?.optionText || '').trim(),
          isCorrect: Boolean(option?.isCorrect),
        }))
      : [];

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

const safeUpdateOperationStatus = async (operationId, payload) => {
  try {
    await updateAssessmentOperationStatus(operationId, payload);
  } catch (error) {
    console.error('Unable to persist assessment update status:', error?.message || error);
  }
};

const buildAssessmentWithStats = async (assessment, actor, scopedCenterId = null) => {
  const visibleClassIds = Array.from(new Set([
    assessment.classId,
    ...((Array.isArray(assessment.allowedClasses) ? assessment.allowedClasses : []).map((item) => item.classId).filter(Boolean)),
  ])).filter(Boolean);

  const [attempts, absentStudents, eligibleStudents] = await Promise.all([
    prisma.assessmentResult.count({
      where: {
        assessmentId: assessment.id,
        status: true,
        ...(scopedCenterId
          ? {
              user: {
                student: {
                  centerId: scopedCenterId,
                },
              },
            }
          : {}),
      },
    }),
    prisma.assessmentAttendance.count({
      where: {
        assessmentId: assessment.id,
        status: 'ABSENT',
        ...(scopedCenterId
          ? {
              user: {
                student: {
                  centerId: scopedCenterId,
                },
              },
            }
          : {}),
      },
    }),
    prisma.user.count({
      where: {
        role: 'STUDENT',
        status: true,
        student: {
          studyingClass: { in: visibleClassIds },
          ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
        },
        ...(actor && !actor.isAdmin && !scopedCenterId && Array.isArray(actor.assignedCenterIds)
          ? {
              student: {
                studyingClass: { in: visibleClassIds },
                centerId: { in: actor.assignedCenterIds.map((centerId) => String(centerId).trim()).filter(Boolean) },
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    ...assessment,
    attempts,
    pending: Math.max(eligibleStudents - attempts - absentStudents, 0),
  };
};

export async function GET(req, { params }) {
  const authUser = getUserFromRequest(req);
  const role = String(authUser?.role || '').toUpperCase();
  if (authUser && ['ADMIN', 'MANAGEMENT', 'TEACHER'].includes(role)) {
    const auth = await requireAdminPermission(req, 'assessments.view');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }
  }

  try {
    const { id } = await params;

    const searchParams = new URL(req.url).searchParams;
    const userId = searchParams.get("userId");

    if (!id) {
      return ApiResponse.error("Subject ID is required", 400);
    }

    // Fetch all assessments
    let scopedCenterId = null;
    if (authUser && ['ADMIN', 'MANAGEMENT', 'TEACHER'].includes(String(authUser.role || '').toUpperCase())) {
      const auth = await requireAdminPermission(req, 'assessments.view');
      if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
      }

      if (auth.actor.isTeacher) {
        const teacherProfile = await prisma.teacher.findUnique({
          where: { userId: auth.actor.userId },
          select: { centerId: true },
        });

        if (!teacherProfile?.centerId) {
          return ApiResponse.error('Teacher account is not mapped to any center.', 400);
        }

        scopedCenterId = teacherProfile.centerId;
      }
    }

    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId: id,
        status: true,
      },
      include: {
        allowedClasses: {
          where: { active: true },
          select: { classId: true },
        },
        questions: {
          where: { status: true },
          orderBy: { displayOrder: "asc" },
          include: {
            options: {
              where: { status: true },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch all assessment results for this user in one query
    let appearedAssessmentIds = new Set();

    if (userId && assessments.length > 0) {
      const assessmentResults = await prisma.assessmentResult.findMany({
        where: {
          userId,
          assessmentId: {
            in: assessments.map((assessment) => assessment.id),
          },
        },
        select: {
          assessmentId: true,
        },
      });

      appearedAssessmentIds = new Set(
        assessmentResults.map((result) => result.assessmentId)
      );
    }

    const assessmentsWithStats = await Promise.all(
      assessments.map(async (assessment) => {
        const assessmentData = await buildAssessmentWithStats(
          assessment,
          authUser ? await requireAdminPermission(req, 'assessments.view').then((auth) => auth.ok ? auth.actor : null) : null,
          scopedCenterId
        );

        return {
          ...assessmentData,
          appeared_status: appearedAssessmentIds.has(assessment.id) ? "Y" : "N",
        };
      })
    );

    return ApiResponse.success(assessmentsWithStats);
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load assessments", 500, error);
  }
}

export async function POST(req, { params }) {
  const auth = await requireAdminPermission(req, 'assessments.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const { title, description, type, questions, totalMarks, gradeBands } = body;

    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
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

    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      return ApiResponse.error('Subject not found', 404);
    }

    if (!(await teacherCanAccessSubject(prisma, id, auth.actor))) {
      return ApiResponse.error('You are not authorized to create an assessment for this subject.', 403);
    }

    const derivedTotalMarks = normalizedQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);

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

      await tx.$executeRawUnsafe(
        'UPDATE "assessments" SET "total_marks" = $1, "grade_bands" = $2 WHERE "id" = $3',
        Number(totalMarks) || derivedTotalMarks,
        typeof gradeBands === 'string' ? gradeBands : JSON.stringify(gradeBands || []),
        createdAssessment.id
      );

      for (const [questionIndex, question] of normalizedQuestions.entries()) {
        const createdQuestion = await tx.assessmentQuestion.create({
          data: {
            assessmentId: createdAssessment.id,
            questionText: question.questionText,
            marks: question.marks,
            displayOrder: questionIndex + 1,
            status: true,
          },
        });

        for (const [optionIndex, option] of question.options.entries()) {
          await tx.assessmentOption.create({
            data: {
              questionId: createdQuestion.id,
              optionText: option.optionText,
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
  const auth = await requireAdminPermission(req, 'assessments.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  let operationId = null;
  try {
    const { id } = await params;
    const body = await req.json();
    const { assessmentId, title, description, type, questions, totalMarks, gradeBands, allowedClassIds, operationId: incomingOperationId } = body;
    operationId = incomingOperationId || null;

    await safeUpdateOperationStatus(operationId, {
      state: 'IN_PROGRESS',
      stage: 'VALIDATING_REQUEST',
      message: 'Validating assessment update request...',
    });

    await ensureAssessmentSchemaColumns(prisma);

    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
    }

    if (!assessmentId) {
      return ApiResponse.error('Assessment ID is required', 400);
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
      where: { id: assessmentId, subjectId: id, status: true },
    });

    if (!existingAssessment) {
      return ApiResponse.error('Assessment not found', 404);
    }

    if (!(await teacherCanAccessAssessment(prisma, assessmentId, auth.actor))) {
      return ApiResponse.error('You are not authorized to manage this assessment.', 403);
    }

    const derivedTotalMarks = normalizedQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);

    await safeUpdateOperationStatus(operationId, {
      state: 'IN_PROGRESS',
      stage: 'UPDATING_ASSESSMENT',
      message: 'Updating assessment structure and questions...',
    });

    const subject = await prisma.subject.findUnique({
      where: { id },
      select: { classId: true },
    });

    const currentClassId = subject?.classId || null;

    const normalizedAllowedClassIds = Array.from(new Set([
      ...(currentClassId ? [String(currentClassId)] : []),
      ...(Array.isArray(allowedClassIds) ? allowedClassIds.map((item) => String(item)) : []),
    ].filter(Boolean))).filter((item) => !!item);

    const assessment = await prisma.$transaction(async (tx) => {
      const existingQuestions = await tx.assessmentQuestion.findMany({
        where: { assessmentId },
        select: { id: true },
      });
      const existingQuestionIds = new Set(existingQuestions.map((question) => question.id));
      const retainedQuestionIds = [];

      await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          type: type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'ASSESSMENT',
        },
      });

      await tx.$executeRawUnsafe(
        'UPDATE "assessments" SET "total_marks" = $1, "grade_bands" = $2 WHERE "id" = $3',
        Number(totalMarks) || derivedTotalMarks,
        typeof gradeBands === 'string' ? gradeBands : JSON.stringify(gradeBands || []),
        assessmentId
      );

      const existingAllowedClasses = await tx.allowedClassesForAssessment.findMany({
        where: { assessmentId },
        select: { classId: true },
      });
      const existingClassIds = new Set(existingAllowedClasses.map((item) => String(item.classId)));
      const nextClassIds = new Set(normalizedAllowedClassIds.map((item) => String(item)));

      for (const entry of existingAllowedClasses) {
        if (!nextClassIds.has(String(entry.classId))) {
          await tx.allowedClassesForAssessment.updateMany({
            where: { assessmentId, classId: entry.classId },
            data: { active: false },
          });
        }
      }

      for (const allowedClassId of normalizedAllowedClassIds) {
        if (!existingClassIds.has(String(allowedClassId))) {
          await tx.allowedClassesForAssessment.create({
            data: {
              assessmentId,
              classId: String(allowedClassId),
              active: true,
            },
          });
          continue;
        }

        await tx.allowedClassesForAssessment.updateMany({
          where: { assessmentId, classId: String(allowedClassId) },
          data: { active: true },
        });
      }

      for (const [questionIndex, question] of normalizedQuestions.entries()) {
        let questionId = null;
        const canReuseQuestion = typeof question.id === 'string' && existingQuestionIds.has(question.id);

        if (canReuseQuestion) {
          await tx.assessmentQuestion.update({
            where: { id: question.id },
            data: {
              questionText: question.questionText,
              marks: question.marks,
              displayOrder: questionIndex + 1,
              status: true,
            },
          });
          questionId = question.id;
        } else {
          const createdQuestion = await tx.assessmentQuestion.create({
            data: {
              assessmentId,
              questionText: question.questionText,
              marks: question.marks,
              displayOrder: questionIndex + 1,
              status: true,
            },
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
              isCorrect: Boolean(option.isCorrect),
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

      const updatedAssessment = await tx.assessment.findUniqueOrThrow({
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

      return updatedAssessment;
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
