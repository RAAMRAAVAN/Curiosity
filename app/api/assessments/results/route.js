import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { calculateGradeFromPercentage, DEFAULT_GRADE_BANDS } from '@/lib/assessmentGrading';
import { createAssessmentResultRecord, getAssessmentMetadata, updateAssessmentResultRecord } from '@/lib/assessmentCompatibility';
import { requireAdminPermission } from '@/lib/adminRbac';

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

    const studentId = userId || user?.userId || user?.id;
    const actorId = user?.userId || user?.id || null;

    if (!studentId) {
      return ApiResponse.error("User is required", 400);
    }

    const isActingForAnotherStudent = Boolean(actorId && studentId && actorId !== studentId);

    if (isActingForAnotherStudent) {
      const requiredPermission = allowReattempt
        ? 'assessments.appeared.reappear'
        : 'assessments.pending.appear';
      const auth = await requireAdminPermission(req, requiredPermission);
      if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
      }

      const targetStudent = await prisma.student.findUnique({
        where: { userId: studentId },
        select: { centerId: true },
      });

      if (!targetStudent) {
        return ApiResponse.error('Student profile not found', 404);
      }

      if (!auth.actor.isAdmin && targetStudent.centerId && !auth.actor.canAccessCenter(targetStudent.centerId)) {
        return ApiResponse.error('You are not authorized to perform this operation.', 403);
      }
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

      const marks = Number(question?.marks ?? 1) || 0;
      if (isCorrect) score += marks;

      evaluatedAnswers.push({
        questionId: question.id,
        selectedOptionIndex:
          Number.isNaN(selectedOptionIndex)
            ? null
            : selectedOptionIndex,
        correctOptionIndex,
        isCorrect,
        marks,
      });
    });

    // ---------------------------------------------------
    // Save Result
    // ---------------------------------------------------

    const assessmentMetadata = await getAssessmentMetadata(prisma, assessmentId);
    const totalMarks = Number(assessmentMetadata.totalMarks || assessment.totalMarks) || questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const gradeBands = typeof assessmentMetadata.gradeBands === 'string'
      ? (() => { try { return JSON.parse(assessmentMetadata.gradeBands); } catch { return DEFAULT_GRADE_BANDS; } })()
      : typeof assessment.gradeBands === 'string'
        ? (() => { try { return JSON.parse(assessment.gradeBands); } catch { return DEFAULT_GRADE_BANDS; } })()
        : Array.isArray(assessment.gradeBands) && assessment.gradeBands.length
          ? assessment.gradeBands
          : DEFAULT_GRADE_BANDS;
    const gradeResult = calculateGradeFromPercentage(percentage, gradeBands);

    const result = await prisma.$transaction(async (tx) => {
      if (existing && (allowReattempt || approvedRequest)) {
        return await updateAssessmentResultRecord(tx, existing.id, {
          score,
          totalQuestions: questions.length,
          totalMarks,
          percentage,
          grade: gradeResult.grade,
          answers: JSON.stringify(evaluatedAnswers),
        });
      }

      return await createAssessmentResultRecord(tx, {
        assessmentId,
        userId: studentId,
        score,
        totalQuestions: questions.length,
        totalMarks,
        percentage,
        grade: gradeResult.grade,
        answers: JSON.stringify(evaluatedAnswers),
      });
    });

    return ApiResponse.success(
      {
        id: result.id,
        score,
        totalQuestions: questions.length,
        totalMarks,
        percentage,
        grade: gradeResult.grade,
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
    const auth = await requireAdminPermission(req, 'results.view');
    if (!auth.ok) {
      return ApiResponse.error(auth.message, auth.status);
    }

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');
    const userId = searchParams.get('userId');

    const results = await prisma.assessmentResult.findMany({
      where: {
        ...(assessmentId ? { assessmentId } : {}),
        ...(userId ? { userId } : {}),
        status: true,
      },
      select: {
        id: true,
        assessmentId: true,
        userId: true,
        score: true,
        totalQuestions: true,
        totalMarks: true,
        percentage: true,
        grade: true,
        answers: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = Array.from(new Set(results.map((result) => result.userId).filter(Boolean)));
    const assessmentIds = Array.from(new Set(results.map((result) => result.assessmentId).filter(Boolean)));

    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const studentProfiles = userIds.length
      ? await prisma.student.findMany({
          where: { userId: { in: userIds } },
          select: {
            userId: true,
            studyingClass: true,
            centerId: true,
            center: {
              select: { name: true },
            },
          },
        })
      : [];

    const assessments = assessmentIds.length
      ? await prisma.assessment.findMany({
          where: { id: { in: assessmentIds }, status: true },
          select: {
            id: true,
            title: true,
            type: true,
            totalMarks: true,
            subjectId: true,
            classId: true,
            // createdAt: true,
          },
        })
      : [];

    const subjectIds = Array.from(new Set(assessments.map((assessment) => assessment.subjectId).filter(Boolean)));
    const assessmentClassIds = Array.from(new Set(assessments.map((assessment) => assessment.classId).filter(Boolean)));
    const studentClassIds = Array.from(new Set(studentProfiles.map((student) => student?.studyingClass).filter(Boolean)));
    const classIds = Array.from(new Set([...assessmentClassIds, ...studentClassIds]));

    const subjects = subjectIds.length
      ? await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, subjectName: true },
        })
      : [];

    const classRecords = classIds.length
      ? await prisma.class.findMany({
          where: {
            OR: [
              { id: { in: classIds } },
              { className: { in: classIds } },
            ],
          },
          select: {
            id: true,
            className: true,
          },
        })
      : [];

    const classMap = classRecords.reduce((acc, cls) => {
      acc[cls.id] = cls.className;
      acc[cls.className] = cls.className;
      return acc;
    }, {});

    const subjectMap = subjects.reduce((acc, subject) => {
      acc[subject.id] = subject.subjectName;
      return acc;
    }, {});

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const studentMap = studentProfiles.reduce((acc, student) => {
      acc[student.userId] = student;
      return acc;
    }, {});

    const assessmentMap = assessments.reduce((acc, assessment) => {
      acc[assessment.id] = assessment;
      return acc;
    }, {});

    const assessmentQuestionMarks = assessmentIds.length
      ? await prisma.assessmentQuestion.findMany({
          where: {
            assessmentId: { in: assessmentIds },
            status: true,
          },
          select: {
            assessmentId: true,
            marks: true,
          },
        })
      : [];

    const questionMarkTotalsByAssessment = assessmentQuestionMarks.reduce((acc, question) => {
      const assessmentId = question.assessmentId;
      const currentTotal = Number(acc[assessmentId] || 0);
      acc[assessmentId] = currentTotal + (Number(question.marks) || 0);
      return acc;
    }, {});

    let mappedResults = results.map((result) => {

      let parsedAnswers = [];

      if (typeof result.answers === 'string') {
        try {
          parsedAnswers = JSON.parse(result.answers || '[]');
        } catch (error) {
          parsedAnswers = [];
        }
      }

      const correctAttempts = Array.isArray(parsedAnswers)
        ? parsedAnswers.filter((item) => item?.isCorrect).length
        : Number(result.score) || 0;

      const wrongAttempts = Array.isArray(parsedAnswers)
        ? parsedAnswers.filter((item) => item?.isCorrect === false).length
        : Math.max(0, (Number(result.totalQuestions) || 0) - (Number(result.score) || 0));

      const questionMarksTotal = Number(questionMarkTotalsByAssessment[result.assessmentId] || 0);
      const totalMarks = Number(result.totalMarks) || Number(result.assessment?.totalMarks) || questionMarksTotal || 0;
      const percentage = Number(result.percentage) || (totalMarks > 0
        ? Math.round((Number(result.score) / totalMarks) * 100)
        : result.totalQuestions
          ? Math.round((Number(result.score) / Number(result.totalQuestions)) * 100)
          : 0);

      const userRecord = userMap[result.userId];
      const studentProfile = studentMap[result.userId];
      const assessmentRecord = assessmentMap[result.assessmentId];

      return {
        ...result,
        user: userRecord
          ? {
              id: userRecord.id,
              name: userRecord.name,
              email: userRecord.email,
            }
          : null,
        assessment: assessmentRecord
          ? {
              id: assessmentRecord.id,
              title: assessmentRecord.title,
              type: assessmentRecord.type,
              totalMarks: assessmentRecord.totalMarks,
              subject: assessmentRecord.subjectId ? { subjectName: subjectMap[assessmentRecord.subjectId] || null } : null,
              class: assessmentRecord.classId ? { className: classMap[assessmentRecord.classId] || classMap[assessmentRecord.classId] || null } : null,
            }
          : null,
        studentClassName:
          classMap[studentProfile?.studyingClass] ||
          studentProfile?.studyingClass ||
          'N/A',
        studentCenterName: studentProfile?.center?.name || 'N/A',
        correctAttempts,
        wrongAttempts,
        percentage,
        totalMarks,
        grade: result.grade || null,
      };
    });

    if (!auth.actor.isAdmin) {
      mappedResults = mappedResults.filter((item) => {
        const studentCenterId = studentMap[item.userId]?.centerId || null;
        return auth.actor.canAccessCenter(studentCenterId);
      });
    }

    return ApiResponse.success(mappedResults);
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load results', 500, error);
  }
}
