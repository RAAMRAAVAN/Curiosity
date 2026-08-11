import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea, canManageAdminData, isTeacher } from "@/lib/roleAccess";
import bcrypt from "bcryptjs";

function formatDateValue(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  return value;
}

function mapStudent(user, classMap = {}) {
  const profile = user.student || {};
  const className = profile.studyingClass
    ? classMap[profile.studyingClass] || null
    : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    centerId: profile.centerId || null,
    centerName: profile.center?.name || null,
    studyingClass: profile.studyingClass || null,
    className,
    dob: formatDateValue(profile.dob),
    gender: profile.gender || "",
    phone: profile.phone || "",
    address: profile.address || "",
    schoolName: profile.schoolName || "",
    status: user.status,
  };
}

export async function GET(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const teacherRole = isTeacher(authUser);
    let scopedCenterId = null;

    if (!canManageAdminData(authUser) && !teacherRole) {
      return ApiResponse.error("Forbidden", 403);
    }

    if (teacherRole) {
      const actorTeacherProfile = await prisma.teacher.findUnique({
        where: { userId: authUser.id },
        select: { centerId: true },
      });

      if (!actorTeacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      scopedCenterId = actorTeacherProfile.centerId;
    }

    const studentUser = await prisma.user.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            center: true,
          },
        },
      },
    });

    if (!studentUser || studentUser.role !== "STUDENT") {
      return ApiResponse.error("Student not found", 404);
    }

    if (teacherRole && studentUser.student?.centerId !== scopedCenterId) {
      return ApiResponse.error("Forbidden", 403);
    }

    const classes = await prisma.class.findMany({ select: { id: true, className: true } });
    const classMap = Object.fromEntries(classes.map((cls) => [cls.id, cls.className]));

    return ApiResponse.success(mapStudent(studentUser, classMap));
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load student", 500, error);
  }
}

export async function PATCH(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const teacherRole = isTeacher(authUser);
    let scopedCenterId = null;

    if (!canManageAdminData(authUser) && !teacherRole) {
      return ApiResponse.error("Forbidden", 403);
    }

    if (teacherRole) {
      const actorTeacherProfile = await prisma.teacher.findUnique({
        where: { userId: authUser.id },
        select: { centerId: true },
      });

      if (!actorTeacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      scopedCenterId = actorTeacherProfile.centerId;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!targetUser || targetUser.role !== "STUDENT") {
      return ApiResponse.error("Student not found", 404);
    }

    if (teacherRole && targetUser.student?.centerId !== scopedCenterId) {
      return ApiResponse.error("Forbidden", 403);
    }

    const body = await req.json();
    const updateData = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.password) updateData.password = await bcrypt.hash(body.password, 10);
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          include: {
            center: true,
          },
        },
      },
    });

    const profileData = {};
    const normalizedCenterId = teacherRole ? scopedCenterId : (body.centerId || null);
    if (body.centerId !== undefined || teacherRole) profileData.centerId = normalizedCenterId;
    if (body.studyingClass !== undefined) profileData.studyingClass = body.studyingClass || null;
    if (body.dob !== undefined) profileData.dob = body.dob ? new Date(body.dob) : null;
    if (body.gender !== undefined) profileData.gender = body.gender || null;
    if (body.phone !== undefined) profileData.phone = body.phone || null;
    if (body.address !== undefined) profileData.address = body.address || null;
    if (body.schoolName !== undefined) profileData.schoolName = body.schoolName || null;

    if (teacherRole && profileData.studyingClass) {
      const selectedClass = await prisma.class.findUnique({
        where: { id: profileData.studyingClass },
        select: { id: true, centerId: true },
      });

      if (!selectedClass) {
        return ApiResponse.error("Selected class does not exist", 400);
      }

      if (selectedClass.centerId && selectedClass.centerId !== scopedCenterId) {
        return ApiResponse.error("Selected class is outside the allowed center", 403);
      }
    }

    if (Object.keys(profileData).length > 0) {
      await prisma.student.upsert({
        where: { userId: id },
        create: { userId: id, ...profileData },
        update: profileData,
      });
    }

    const [refreshedUser, classes] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          student: {
            include: {
              center: true,
            },
          },
        },
      }),
      prisma.class.findMany({ select: { id: true, className: true } }),
    ]);

    const classMap = Object.fromEntries(classes.map((cls) => [cls.id, cls.className]));

    return ApiResponse.success(mapStudent(refreshedUser, classMap), "Student updated successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to update student", 500, error);
  }
}

export async function DELETE(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  if (!canManageAdminData(authUser)) {
    return ApiResponse.error("Forbidden", 403);
  }

  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return ApiResponse.success(null, "Student deleted successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to delete student", 500, error);
  }
}
