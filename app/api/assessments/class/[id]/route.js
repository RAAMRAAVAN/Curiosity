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
        const { id: classSlug } = await params;

        if (!classSlug) {
            return ApiResponse.error("Class is required", 400);
        }

        // Find class by className (e.g. "class-6")
        const classData = await prisma.class.findUnique({
            where: {
                className: classSlug,
            },
            select: {
                id: true,
            },
        });

        if (!classData) {
            return ApiResponse.error("Class not found", 404);
        }

        const assessments = await prisma.assessment.findMany({
            where: {
                classId: classData.id,
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
        console.error(error.message);

        return ApiResponse.error(
            "Unable to load assessments",
            500,
            {
                message: error.message,
                stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
            }
        );
    }
}