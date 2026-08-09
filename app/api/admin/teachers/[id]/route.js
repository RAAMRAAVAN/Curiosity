import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { canAccessAdminArea } from "@/lib/roleAccess";

export async function DELETE(req, { params }) {
    try {
        const authUser = getUserFromRequest(req);

        if (!authUser || !canAccessAdminArea(authUser)) {
            return ApiResponse.error("Unauthorized", 401);
        }

        const { id } = params;

        if (!id) {
            return ApiResponse.error("Teacher ID is required.", 400);
        }

        const teacher = await prisma.teacher.findUnique({
            where: {
                id,
            },
        });

        if (!teacher) {
            return ApiResponse.error("Teacher not found.", 404);
        }

        await prisma.teacher.delete({
            where: {
                id,
            },
        });

        return ApiResponse.success(null, "Teacher removed successfully.");
    } catch (error) {
        console.error(error);
        return ApiResponse.error("Internal Server Error", 500);
    }
}