import { prisma } from '@/server/prisma'; // Update if your prisma import is different
import { ApiResponse } from '@/utils/apiResponse';
import { requireAdminPermission } from '@/lib/adminRbac';
// import { buildAssessmentWithStats } from "@/lib/assessment"; // Update path if needed

const getAssessmentEligibleStudentIds = async (assessment, actor, scopedCenterId = null) => {
    const visibleClassIds = Array.from(new Set([
        assessment.classId,
        ...((Array.isArray(assessment.allowedClasses) ? assessment.allowedClasses : []).map((item) => item.classId).filter(Boolean)),
    ])).filter(Boolean);

    if (!visibleClassIds.length) {
        return [];
    }

    const centerFilter = !actor?.isAdmin && !scopedCenterId && Array.isArray(actor?.assignedCenterIds)
        ? {
            in: actor.assignedCenterIds.map((centerId) => String(centerId).trim()).filter(Boolean),
        }
        : scopedCenterId
            ? scopedCenterId
            : undefined;

    const students = await prisma.user.findMany({
        where: {
            role: 'STUDENT',
            status: true,
            student: {
                studyingClass: { in: visibleClassIds },
                ...(centerFilter !== undefined ? { centerId: centerFilter } : {}),
            },
        },
        select: { id: true },
    });

    return students.map((student) => student.id);
};

const buildAssessmentWithStats = async (assessment, actor, scopedCenterId = null) => {
    const eligibleStudentIds = await getAssessmentEligibleStudentIds(assessment, actor, scopedCenterId);

    const [attemptCount, attemptUsers, absentStudents] = await Promise.all([
        prisma.assessmentResult.count({
            where: {
                assessmentId: assessment.id,
                status: true,
                user: {
                    student: {
                        ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
                    },
                },
            },
        }),
        prisma.assessmentResult.findMany({
            where: {
                assessmentId: assessment.id,
                status: true,
                user: {
                    student: {
                        ...(scopedCenterId ? { centerId: scopedCenterId } : {}),
                    },
                },
            },
            select: { userId: true },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.assessmentAttendance.findMany({
            where: {
                assessmentId: assessment.id,
                status: 'ABSENT',
            },
            select: { userId: true },
        }),
    ]);

    const attemptUserIds = new Set(attemptUsers.map((item) => item.userId));
    const absentUserIds = new Set(absentStudents.map((item) => item.userId));
    const pending = eligibleStudentIds.filter((id) => !attemptUserIds.has(id) && !absentUserIds.has(id)).length;

    return {
        ...assessment,
        attempts: attemptCount,
        pending,
    };
};

export async function GET(req, { params }) {
    try {
        const auth = await requireAdminPermission(req, 'assessments.view');
        if (!auth.ok) {
            return ApiResponse.error(auth.message, auth.status);
        }

        const { id: classId } = await params;
        const searchParams = new URL(req.url).searchParams;
        const subjectId = searchParams.get('subjectId');
        const chapterId = searchParams.get('chapterId');

        let scopedCenterId = null;
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

        if (!classId) {
            return ApiResponse.error("Class ID is required", 400);
        }

            // Load class record to also match students who have stored className in their profile
            const classRecord = await prisma.class.findUnique({
                where: { id: classId },
                select: { id: true, className: true, centerId: true },
            });

            if (scopedCenterId && classRecord?.centerId && classRecord.centerId !== scopedCenterId) {
                return ApiResponse.error('Forbidden', 403);
            }

            const studyingClassValues = classRecord
                ? [classId, classRecord.className]
                : [classId];

            const assessments = await prisma.assessment.findMany({
            where: {
                classId,
                subjectId: subjectId || undefined,
                chapterId: chapterId || undefined,
                status: true,
            },
            include: {
                subject: {
                    select: {
                        id: true,
                        subjectName: true,
                        classId: true,
                    },
                },
                allowedClasses: {
                    where: {
                        active: true,
                    },
                    select: {
                        classId: true,
                    },
                },
                questions: {
                    where: {
                        status: true,
                    },
                    orderBy: {
                        displayOrder: "asc",
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
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // console.log('[assessments-class] assessments fetched', {
        //     classId,
        //     assessmentCount: assessments.length,
        //     assessmentIds: assessments.map((assessment) => assessment.id),
        // });

        const assessmentsWithStats = await Promise.all(
            assessments.map((assessment) =>
                buildAssessmentWithStats(assessment, auth.actor, scopedCenterId)
            )
        );

        return ApiResponse.success(assessmentsWithStats);
    } catch (error) {
        console.error(error);

        return ApiResponse.error(
            "Unable to load assessments",
            500,
            {
                message: error.message,
                stack:
                    process.env.NODE_ENV === "development"
                        ? error.stack
                        : undefined,
            }
        );
    }
}