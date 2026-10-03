import { prisma } from '@/server/prisma'; // Update if your prisma import is different
import { ApiResponse } from '@/utils/apiResponse';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssessmentVisibleClassValues } from '@/lib/assessmentStudentScope';
// import { buildAssessmentWithStats } from "@/lib/assessment"; // Update path if needed

const getAccessibleCenterIds = (actor, scopedCenterId) => {
    if (actor?.isAdmin) return null;

    return Array.from(new Set(
        (scopedCenterId
            ? [scopedCenterId]
            : Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
            .map((centerId) => String(centerId).trim())
            .filter(Boolean)
    ));
};

const getAssessmentEligibleStudentIds = async (assessment, accessibleCenterIds, teacherClassIds) => {
    const visibleClassValues = getAssessmentVisibleClassValues(assessment, accessibleCenterIds, teacherClassIds);
    if (!visibleClassValues.length) return [];

    const centerFilter = accessibleCenterIds === null
        ? undefined
        : { in: accessibleCenterIds };

    const students = await prisma.user.findMany({
        where: {
            role: 'STUDENT',
            status: true,
            student: {
                studyingClass: { in: visibleClassValues },
                ...(centerFilter !== undefined ? { centerId: centerFilter } : {}),
            },
        },
        select: { id: true },
    });

    return students.map((student) => student.id);
};

const buildAssessmentWithStats = async (assessment, accessibleCenterIds, teacherClassIds) => {
    const eligibleStudentIds = await getAssessmentEligibleStudentIds(assessment, accessibleCenterIds, teacherClassIds);

    const [attemptUsers, absentStudents] = await Promise.all([
        prisma.assessmentResult.findMany({
            where: {
                assessmentId: assessment.id,
                status: true,
                userId: { in: eligibleStudentIds },
            },
            select: { userId: true },
        }),
        prisma.assessmentAttendance.findMany({
            where: {
                assessmentId: assessment.id,
                status: 'ABSENT',
                userId: { in: eligibleStudentIds },
            },
            select: { userId: true },
        }),
    ]);

    const attemptUserIds = new Set(attemptUsers.map((item) => item.userId));
    const absentUserIds = new Set(absentStudents.map((item) => item.userId));
    const pending = eligibleStudentIds.filter((id) => !attemptUserIds.has(id) && !absentUserIds.has(id)).length;
    const attemptCount = eligibleStudentIds.filter((id) => attemptUserIds.has(id)).length;

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
        let teacherId = null;
        let teacherClassIds = null;
        if (auth.actor.isTeacher) {
            const teacherProfile = await prisma.teacher.findUnique({
                where: { userId: auth.actor.userId },
                select: {
                    id: true,
                    centerId: true,
                    user: { select: { classAccesses: { where: { status: true }, select: { classId: true } } } },
                },
            });

            if (!teacherProfile?.centerId) {
                return ApiResponse.error('Teacher account is not mapped to any center.', 400);
            }

            scopedCenterId = teacherProfile.centerId;
            teacherId = teacherProfile.id;
            teacherClassIds = teacherProfile.user.classAccesses.map((access) => access.classId);
        }

        if (!classId) {
            return ApiResponse.error("Class ID is required", 400);
        }

        if (auth.actor.isTeacher) {
            const classAccess = await prisma.userClassAccess.findFirst({
                where: { userId: auth.actor.userId, classId, status: true },
                select: { id: true },
            });
            if (!classAccess) {
                return ApiResponse.error('You are not authorized to view this class.', 403);
            }
        }

            // Load class record to also match students who have stored className in their profile
            const classRecord = await prisma.class.findUnique({
                where: { id: classId },
                select: { id: true, className: true, centerId: true },
            });

            if (scopedCenterId && classRecord?.centerId && classRecord.centerId !== scopedCenterId) {
                return ApiResponse.error('Forbidden', 403);
            }

            const assessments = await prisma.assessment.findMany({
            where: {
                classId,
                subjectId: subjectId || undefined,
                chapterId: chapterId || undefined,
                status: true,
                ...(teacherId ? { subject: { teacherSubjects: { some: { teacherId, status: true } } } } : {}),
            },
            include: {
                class: { select: { id: true, className: true, centerId: true } },
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
                        class: { select: { id: true, className: true, centerId: true } },
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

        const accessibleCenterIds = getAccessibleCenterIds(auth.actor, scopedCenterId);
        const assessmentsWithStats = await Promise.all(
            assessments.map((assessment) =>
                buildAssessmentWithStats(assessment, accessibleCenterIds, teacherClassIds)
            )
        );

        return ApiResponse.success(assessmentsWithStats);
    } catch (error) {
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