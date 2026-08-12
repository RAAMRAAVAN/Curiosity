import { getUserFromRequest } from "@/server/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/prisma";
import { ApiResponse } from "@/utils/apiResponse";
import { formatDate } from "@/lib/date";
import { requireAdminPermission } from '@/lib/adminRbac';

function formatTeacherResponse(teacher, classIds = [], classNames = []) {
    return {
        id: teacher.id,
        userId: teacher.userId,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
        name: teacher.user.name,
        email: teacher.user.email,
        gender: teacher.gender,
        phone: teacher.phone,
        address: teacher.address,
        dob: formatDate(teacher.dob),
        role: teacher.user.role,
        centerId: teacher.centerId || null,
        centerName: teacher.center?.name || null,
        classIds,
        classNames,
        status: teacher.status,
    };
}

export async function GET(req) {
    const auth = await requireAdminPermission(req, 'teachers.view');
    if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
    }

    const teacherRole = auth.actor.isTeacher;
    let scopedCenterId = null;

    if (teacherRole) {
        const teacherProfile = await prisma.teacher.findUnique({
            where: { userId: auth.actor.userId },
            select: { centerId: true },
        });

        scopedCenterId = teacherProfile?.centerId || null;
    }

    let teachers = await prisma.teacher.findMany({
        where: teacherRole
            ? { centerId: scopedCenterId || "__NO_CENTER__" }
            : undefined,
        orderBy: {
            createdAt: "desc",
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
            center: true,
        },
    });

    if (!teacherRole && !auth.actor.isAdmin) {
        teachers = teachers.filter((teacher) => auth.actor.canAccessCenter(teacher.centerId));
    }

    const userIds = teachers.map((teacher) => teacher.userId).filter(Boolean);
    const classAccesses = userIds.length
        ? await prisma.userClassAccess.findMany({
            where: { userId: { in: userIds }, status: true },
            include: { class: { select: { id: true, className: true } } },
        })
        : [];

    const classMap = new Map();
    for (const access of classAccesses) {
        const existing = classMap.get(access.userId) || [];
        existing.push(access.class);
        classMap.set(access.userId, existing);
    }

    const result = teachers.map((teacher) => {
        const classes = classMap.get(teacher.userId) || [];
        return formatTeacherResponse(
            teacher,
            classes.map((item) => item.id),
            classes.map((item) => item.className)
        );
    });

    return ApiResponse.success(result);
}

export async function POST(req) {
    try {
        const auth = await requireAdminPermission(req, 'teachers.create');
        if (!auth.ok) {
            return ApiResponse.error(auth.message, auth.status);
        }

        const body = await req.json();

        if (!body.name) {
            return ApiResponse.error("Name is required", 400);
        }

        let finalCenterId = body.centerId || null;
        if (auth.actor.isTeacher) {
            const teacherProfile = await prisma.teacher.findUnique({
                where: { userId: auth.actor.userId },
                select: { centerId: true },
            });

            if (!teacherProfile?.centerId) {
                return ApiResponse.error("Teacher account is not mapped to any center.", 400);
            }

            finalCenterId = teacherProfile.centerId;
        }

        if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(finalCenterId)) {
            return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
        }

        const baseName = body.name.trim().toLowerCase().split(/\s+/)[0] || "teacher";
        let email = `${baseName}@curiosity.com`;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { email } })) {
            email = `${baseName}${counter}@curiosity.com`;
            counter += 1;
        }

        const hashedPassword = await bcrypt.hash("123456", 10);

        const user = await prisma.user.create({
            data: {
                name: body.name,
                email,
                password: hashedPassword,
                role: "TEACHER",
                centerId: finalCenterId,
                status: body.status !== undefined ? Boolean(body.status) : true,
            },
        });

        const teacherCreateData = {
            user: {
                connect: { id: user.id },
            },
            name: user.name,
            phone: body.phone ? String(body.phone).trim() : null,
        };

        if (finalCenterId) {
            teacherCreateData.center = { connect: { id: finalCenterId } };
        }
        if (body.gender) {
            teacherCreateData.gender = body.gender;
        }
        if (body.address) {
            teacherCreateData.address = body.address;
        }
        if (body.dob) {
            teacherCreateData.dob = new Date(body.dob);
        }

        const teacher = await prisma.teacher.create({
            data: teacherCreateData,
            include: {
                user: true,
                center: true,
            },
        });

        return ApiResponse.success(
            formatTeacherResponse(teacher, [], []),
            "Teacher created successfully."
        );
    } catch (error) {
        console.error(error);
        return ApiResponse.error("Unable to create teacher", 500, error);
    }
}