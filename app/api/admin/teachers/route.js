import { getUserFromRequest } from "@/server/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/utils/apiResponse";
import { formatDate } from "@/lib/date";

export async function GET(req) {
    const authUser = getUserFromRequest(req);

    if (!authUser || authUser.role !== "ADMIN") {
        return ApiResponse.error("Unauthorized", 401);
    }

    const teachers = await prisma.teacher.findMany({
        orderBy: {
            createdAt: "desc",
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    gender: true,
                    phone: true,
                    address: true,
                    dob: true,
                    role: true,
                },
            },
        },
    });

    const result = teachers.map((teacher) => ({
        id: teacher.id,
        userId: teacher.userId,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,

        name: teacher.user.name,
        email: teacher.user.email,
        gender: teacher.user.gender,
        phone: teacher.user.phone,
        address: teacher.user.address,
        dob: formatDate(teacher.user.dob),
        role: teacher.user.role,
    }));

    return ApiResponse.success(result);
}

export async function POST(req) {
    try {
        const authUser = getUserFromRequest(req);

        if (!authUser || authUser.role !== "ADMIN") {
            return ApiResponse.error("Unauthorized", 401);
        }

        const body = await req.json();

        const {
            userId } = body;

        // Validation
        if (!userId) {
            return ApiResponse.error(
                "Please create a user before creating Teacher",
                400
            );
        }

        // Check User exists
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            return ApiResponse.error("User not found.", 404);
        }

        // Check if teacher already exists for this user
        const existingTeacher = await prisma.teacher.findUnique({
            where: {
                userId,
            },
        });

        if (existingTeacher) {
            return ApiResponse.error("Teacher already exists for this user.", 409);
        }

        // Create Teacher
        // Create Teacher
        const teacher = await prisma.teacher.create({
            data: {
                userId,
                name: user.name,
                phone: user.phone,
                address: user.address,
                gender: user.gender,
                dob: user.dob,
            },
            include: {
                user: true,
            },
        });

        return ApiResponse.success(
            teacher,
            "Teacher created successfully."
        );
    } catch (error) {
        console.error(error);
        return ApiResponse.error("Internal Server Error", 500);
    }
}