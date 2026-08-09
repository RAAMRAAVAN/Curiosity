import { prisma } from '@/server/prisma'; // Update if your prisma import is different
import { ApiResponse } from '@/utils/apiResponse';
// import { buildAssessmentWithStats } from "@/lib/assessment"; // Update path if needed

const buildAssessmentWithStats = async (assessment, eligibleStudentIds) => {
    const [attempts, attemptUsers] = await Promise.all([
        prisma.assessmentResult.count({
            where: { assessmentId: assessment.id, status: true },
        }),
        prisma.assessmentResult.findMany({
            where: { assessmentId: assessment.id, status: true },
            select: { userId: true },
            orderBy: { createdAt: 'asc' },
        }),
    ]);

    const attemptUserIds = attemptUsers.map((item) => item.userId);
    const matchedIds = eligibleStudentIds.filter((id) => attemptUserIds.includes(id));
    const missingIds = eligibleStudentIds.filter((id) => !attemptUserIds.includes(id));

    const pending = Math.max(missingIds.length, 0);

    console.log('[assessments-class] assessment stats', {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        eligibleStudentCount: eligibleStudentIds.length,
        attempts,
        pending,
        eligibleStudentIds,
        attemptUserIds,
        matchedIds,
        missingIds,
    });

    return {
        ...assessment,
        attempts,
        pending,
    };
};

export async function GET(req, { params }) {
    try {
        const { id: classId } = await params;
        const searchParams = new URL(req.url).searchParams;
        const subjectId = searchParams.get('subjectId');
        const chapterId = searchParams.get('chapterId');

        if (!classId) {
            return ApiResponse.error("Class ID is required", 400);
        }

        const eligibleStudents = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                status: true,
                studyingClass: classId,
            },
            select: {
                id: true,
                name: true,
                studyingClass: true,
                role: true,
                status: true,
            },
            take: 10,
        });

        const eligibleStudentIds = eligibleStudents.map((student) => student.id);
        const eligibleStudentCount = eligibleStudentIds.length;

        console.log('[assessments-class] class lookup', {
            classId,
            eligibleStudentCount,
            eligibleStudentIds,
            sampleEligibleStudents: eligibleStudents,
        });

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

        console.log('[assessments-class] assessments fetched', {
            classId,
            assessmentCount: assessments.length,
            assessmentIds: assessments.map((assessment) => assessment.id),
        });

        const assessmentsWithStats = await Promise.all(
            assessments.map((assessment) =>
                buildAssessmentWithStats(assessment, eligibleStudentIds)
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