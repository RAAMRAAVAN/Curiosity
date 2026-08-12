import bcrypt from "bcryptjs";
import { prisma } from "@/server/prisma";
import { ApiResponse } from "@/utils/apiResponse";
import { requireAdminPermission } from '@/lib/adminRbac';

function toDateInputValue(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDobValue(value) {
    if (value === null || value === "") {
        return { ok: true, value: null };
    }

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return { ok: false };
        }
        return { ok: true, value };
    }

    if (typeof value !== "string") {
        return { ok: false };
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return { ok: true, value: null };
    }

    // Supports HTML date input (YYYY-MM-DD).
    const isoDateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
        const [, year, month, day] = isoDateOnlyMatch;
        const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
            return { ok: false };
        }
        return { ok: true, value: parsed };
    }

    // Backward compatibility for previously returned DD-MM-YYYY values.
    const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
            return { ok: false };
        }
        return { ok: true, value: parsed };
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return { ok: false };
    }

    return { ok: true, value: parsed };
}

function formatTeacherResponse(teacher, classIds = [], classNames = []) {
    return {
        id: teacher.id,
        userId: teacher.userId,
        name: teacher.user.name,
        email: teacher.user.email,
        gender: teacher.gender,
        phone: teacher.phone,
        address: teacher.address,
        dob: toDateInputValue(teacher.dob),
        centerId: teacher.centerId || null,
        centerName: teacher.center?.name || null,
        classIds,
        classNames,
        status: teacher.status,
    };
}

export async function GET(req, { params }) {
    const auth = await requireAdminPermission(req, 'teachers.view');
    if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
    }

    const { id } = await params;
    let scopedCenterId = null;

    if (auth.actor.isTeacher) {
        const teacherProfile = await prisma.teacher.findUnique({
            where: { userId: auth.actor.userId },
            select: { centerId: true },
        });
        scopedCenterId = teacherProfile?.centerId || null;
    }

    const teacher = await prisma.teacher.findUnique({
        where: auth.actor.isTeacher
            ? { id, centerId: scopedCenterId || "__NO_CENTER__" }
            : { id },
        include: {
            user: true,
            center: true,
        },
    });

    if (!teacher) {
        return ApiResponse.error("Teacher not found", 404);
    }

    if (!auth.actor.isAdmin && !auth.actor.isTeacher && !auth.actor.canAccessCenter(teacher.centerId)) {
        return ApiResponse.error('Forbidden', 403);
    }

    const classAccesses = await prisma.userClassAccess.findMany({
        where: { userId: teacher.userId, status: true },
        include: { class: { select: { id: true, className: true } } },
    });

    const classIds = classAccesses.map((access) => access.class.id);
    const classNames = classAccesses.map((access) => access.class.className);

    return ApiResponse.success(formatTeacherResponse(teacher, classIds, classNames));
}

export async function PATCH(req, { params }) {
    const auth = await requireAdminPermission(req, 'teachers.edit');
    if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
    }

    try {
        const teacherRole = auth.actor.isTeacher;
        let scopedCenterId = null;

        if (teacherRole) {
            const actorTeacherProfile = await prisma.teacher.findUnique({
                where: { userId: auth.actor.userId },
                select: { centerId: true },
            });

            if (!actorTeacherProfile?.centerId) {
                return ApiResponse.error("Teacher account is not mapped to any center.", 400);
            }

            scopedCenterId = actorTeacherProfile.centerId;
        }

        const { id } = await params;
        const body = await req.json();
        const teacher = await prisma.teacher.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!teacher) {
            return ApiResponse.error("Teacher not found", 404);
        }

        if (teacherRole && teacher.centerId !== scopedCenterId) {
            return ApiResponse.error("Forbidden", 403);
        }

        if (!auth.actor.isAdmin && !teacherRole && !auth.actor.canAccessCenter(teacher.centerId)) {
            return ApiResponse.error('Forbidden', 403);
        }

        const teacherUpdateData = {};
        const hasCenterUpdate = body.centerId !== undefined;
        const normalizedCenterId = teacherRole
            ? scopedCenterId
            : (body.centerId || null);
        if (!auth.actor.isAdmin && !teacherRole && !auth.actor.canAccessCenter(normalizedCenterId)) {
            return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
        }
        if (body.name !== undefined) teacherUpdateData.name = body.name;
        if (body.gender !== undefined) {
            teacherUpdateData.gender = body.gender || null;
        }
        if (body.phone !== undefined) {
            const normalizedPhone = typeof body.phone === "string" ? body.phone.trim() : "";
            if (normalizedPhone) {
                teacherUpdateData.phone = normalizedPhone;
            }
        }
        if (body.address !== undefined) {
            teacherUpdateData.address = body.address || null;
        }
        if (body.dob !== undefined) {
            const parsedDob = parseDobValue(body.dob);
            if (!parsedDob.ok) {
                return ApiResponse.error("Invalid date of birth format", 400);
            }
            teacherUpdateData.dob = parsedDob.value;
        }
        if (body.status !== undefined) teacherUpdateData.status = Boolean(body.status);

        if (Object.keys(teacherUpdateData).length > 0 || hasCenterUpdate) {
            const updateWithCenterId = {
                ...teacherUpdateData,
                ...(hasCenterUpdate ? { centerId: normalizedCenterId } : {}),
            };

            try {
                await prisma.teacher.update({
                    where: { id },
                    data: updateWithCenterId,
                });
            } catch (updateError) {
                const shouldRetryWithRelationSyntax =
                    hasCenterUpdate &&
                    updateError?.name === "PrismaClientValidationError" &&
                    String(updateError?.message || "").includes("Unknown argument `centerId`");

                if (!shouldRetryWithRelationSyntax) {
                    throw updateError;
                }

                const fallbackData = {
                    ...teacherUpdateData,
                    center: normalizedCenterId
                        ? { connect: { id: normalizedCenterId } }
                        : { disconnect: true },
                };

                await prisma.teacher.update({
                    where: { id },
                    data: fallbackData,
                });
            }
        }

        const userUpdateData = {};
        if (body.name !== undefined) userUpdateData.name = body.name;
        if (body.email && body.email !== teacher.user.email) {
            const existing = await prisma.user.findUnique({ where: { email: body.email } });
            if (existing && existing.id !== teacher.userId) {
                return ApiResponse.error("Email already in use", 400);
            }
            userUpdateData.email = body.email;
        }
        if (body.password) {
            userUpdateData.password = await bcrypt.hash(body.password, 10);
        }
        if (body.status !== undefined) userUpdateData.status = Boolean(body.status);

        if (Object.keys(userUpdateData).length > 0) {
            await prisma.user.update({
                where: { id: teacher.userId },
                data: userUpdateData,
            });
        }

        if (body.classIds !== undefined) {
            const selectedClassIds = Array.isArray(body.classIds)
                ? body.classIds.filter(Boolean)
                : [];

            if (teacherRole && selectedClassIds.length > 0) {
                const allowedClasses = await prisma.class.findMany({
                    where: {
                        id: { in: selectedClassIds },
                        centerId: scopedCenterId,
                    },
                    select: { id: true },
                });

                if (allowedClasses.length !== selectedClassIds.length) {
                    return ApiResponse.error("One or more selected classes are outside your center", 403);
                }
            }

            await prisma.userClassAccess.deleteMany({ where: { userId: teacher.userId } });

            if (selectedClassIds.length > 0) {
                await prisma.userClassAccess.createMany({
                    data: selectedClassIds.map((classId) => ({ userId: teacher.userId, classId, status: true })),
                    skipDuplicates: true,
                });
            }
        }

        const refreshedTeacher = await prisma.teacher.findUnique({
            where: { id },
            include: {
                user: true,
                center: true,
            },
        });

        const classAccesses = await prisma.userClassAccess.findMany({
            where: { userId: refreshedTeacher.userId, status: true },
            include: { class: { select: { id: true, className: true } } },
        });

        const classIds = classAccesses.map((access) => access.class.id);
        const classNames = classAccesses.map((access) => access.class.className);

        return ApiResponse.success(formatTeacherResponse(refreshedTeacher, classIds, classNames), "Teacher updated successfully.");
    } catch (error) {
        console.error(error);
        return ApiResponse.error("Unable to update teacher", 500, error);
    }
}

export async function DELETE(req, { params }) {
    try {
        const auth = await requireAdminPermission(req, 'teachers.delete');
        if (!auth.ok) {
            return ApiResponse.error(auth.message, auth.status);
        }

        const { id } = await params;

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

        if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(teacher.centerId)) {
            return ApiResponse.error('Forbidden', 403);
        }

        await prisma.teacher.delete({
            where: {
                id,
            },
        });

        await prisma.user.delete({
            where: {
                id: teacher.userId,
            },
        });

        return ApiResponse.success(null, "Teacher removed successfully.");
    } catch (error) {
        console.error(error);
        return ApiResponse.error("Unable to remove teacher", 500, error);
    }
}