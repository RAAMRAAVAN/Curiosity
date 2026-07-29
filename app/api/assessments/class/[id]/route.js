import { prisma } from '@/server/prisma'; // Update if your prisma import is different
import { ApiResponse } from '@/utils/apiResponse';
// import { buildAssessmentWithStats } from "@/lib/assessment"; // Update path if needed

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
        const { id: classId } = await params;
        const searchParams = new URL(req.url).searchParams;
        const subjectId = searchParams.get('subjectId');
        const chapterId = searchParams.get('chapterId');

        if (!classId) {
            return ApiResponse.error("Class ID is required", 400);
        }

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

        const assessmentsWithStats = await Promise.all(
            assessments.map((assessment) =>
                buildAssessmentWithStats(assessment, assessment.subjectId)
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