import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';
import bcrypt from "bcryptjs";
import { getTeacherAssignedClassIds } from "@/lib/teacherClassAccess";
import { createStudentIdentityKey, isStudentIdentityTaken } from "@/lib/studentIdentity";

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
    teaGarden: profile.teaGarden || "",
    fatherName: profile.fatherName || "",
    motherName: profile.motherName || "",
    status: user.status,
  };
}

export async function GET(req, { params }) {
  const auth = await requireAdminPermission(req, 'students.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    const teacherRole = auth.actor.isTeacher;
    let scopedCenterId = null;
    let assignedClassIds = null;

    if (teacherRole) {
      const actorTeacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { centerId: true },
      });

      if (!actorTeacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      scopedCenterId = actorTeacherProfile.centerId;
      assignedClassIds = await getTeacherAssignedClassIds(prisma, auth.actor.userId);
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

    if (teacherRole && assignedClassIds && !assignedClassIds.includes(studentUser.student?.studyingClass)) {
      return ApiResponse.error("Forbidden", 403);
    }

    if (!auth.actor.isAdmin && !teacherRole && !auth.actor.canAccessCenter(studentUser.student?.centerId)) {
      return ApiResponse.error('Forbidden', 403);
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
  const auth = await requireAdminPermission(req, 'students.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    const teacherRole = auth.actor.isTeacher;
    let scopedCenterId = null;
    let assignedClassIds = null;

    if (teacherRole) {
      const actorTeacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { centerId: true },
      });

      if (!actorTeacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      scopedCenterId = actorTeacherProfile.centerId;
      assignedClassIds = await getTeacherAssignedClassIds(prisma, auth.actor.userId);
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

    if (teacherRole && assignedClassIds && !assignedClassIds.includes(targetUser.student?.studyingClass)) {
      return ApiResponse.error("Forbidden", 403);
    }

    if (!auth.actor.isAdmin && !teacherRole && !auth.actor.canAccessCenter(targetUser.student?.centerId)) {
      return ApiResponse.error('Forbidden', 403);
    }

    const body = await req.json();
    const existingProfile = targetUser.student || {};
    const name = body.name !== undefined ? String(body.name || '').trim() : String(targetUser.name || '').trim();
    const fatherName = body.fatherName !== undefined || body.guardianName !== undefined
      ? String(body.fatherName ?? body.guardianName ?? '').trim()
      : String(existingProfile.fatherName || '').trim();
    const motherName = body.motherName !== undefined
      ? String(body.motherName || '').trim()
      : String(existingProfile.motherName || '').trim();
    const normalizedCenterId = teacherRole
      ? scopedCenterId
      : body.centerId !== undefined ? String(body.centerId || '').trim() : existingProfile.centerId || '';
    const studyingClass = body.studyingClass !== undefined
      ? String(body.studyingClass || '').trim()
      : String(existingProfile.studyingClass || '').trim();
    const dobValue = body.dob !== undefined
      ? String(body.dob || '').trim()
      : existingProfile.dob ? existingProfile.dob.toISOString().slice(0, 10) : '';
    const dob = dobValue ? new Date(dobValue) : null;
    const gender = body.gender !== undefined ? String(body.gender || '').trim() : String(existingProfile.gender || '').trim();

    const missingFields = [
      ['Full Name', name],
      ['Center', normalizedCenterId],
      ['Class', studyingClass],
      ['Date of Birth', dobValue],
      ['Gender', gender],
      ["Father's Name", fatherName],
      ["Mother's Name", motherName],
    ].filter(([, value]) => !value).map(([label]) => label);
    if (missingFields.length) {
      return ApiResponse.error(`Please complete these required fields: ${missingFields.join(', ')}.`, 400);
    }
    if (!dob || Number.isNaN(dob.getTime())) {
      return ApiResponse.error("A valid Date of Birth is required.", 400);
    }

    if (!auth.actor.isAdmin && !teacherRole && !auth.actor.canAccessCenter(normalizedCenterId)) {
      return ApiResponse.error('Forbidden: center is not assigned to this user.', 403);
    }
    const selectedClass = await prisma.class.findUnique({
      where: { id: studyingClass },
      select: { id: true, centerId: true },
    });
    if (!selectedClass) return ApiResponse.error("Selected class does not exist", 400);
    if (selectedClass.centerId && selectedClass.centerId !== normalizedCenterId) {
      return ApiResponse.error("Selected class is outside the allowed center", 403);
    }
    if (teacherRole && assignedClassIds && !assignedClassIds.includes(selectedClass.id)) {
      return ApiResponse.error("Selected class is not assigned to you", 403);
    }

    const identityKey = createStudentIdentityKey({ name, fatherName, motherName });
    if (await isStudentIdentityTaken(prisma, identityKey, id)) {
      return ApiResponse.error("A student with this Full Name, Father's Name, and Mother's Name already exists.", 409);
    }

    const updateData = { name };
    if (body.email !== undefined) updateData.email = body.email;
    if (body.password) updateData.password = await bcrypt.hash(body.password, 10);
    if (body.status !== undefined) updateData.status = Boolean(body.status);

    const profileData = {
      centerId: normalizedCenterId,
      studyingClass,
      dob,
      gender,
      fatherName,
      motherName,
      identityKey,
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.address !== undefined ? { address: body.address || null } : {}),
      ...(body.schoolName !== undefined ? { schoolName: body.schoolName || null } : {}),
      ...(body.teaGarden !== undefined ? { teaGarden: body.teaGarden?.trim() || null } : {}),
    };

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: updateData });
      await tx.student.upsert({
        where: { userId: id },
        create: { userId: id, ...profileData },
        update: profileData,
      });
    });

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
    if (error?.code === 'P2002' && String(error?.meta?.target || '').includes('identity_key')) {
      return ApiResponse.error("A student with this Full Name, Father's Name, and Mother's Name already exists.", 409);
    }
    console.error(error);
    return ApiResponse.error("Unable to update student", 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'students.delete');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!target || target.role !== 'STUDENT') {
      return ApiResponse.error('Student not found', 404);
    }

    if (!auth.actor.isAdmin && !auth.actor.canAccessCenter(target.student?.centerId)) {
      return ApiResponse.error('Forbidden', 403);
    }

    await prisma.user.delete({ where: { id } });
    return ApiResponse.success(null, "Student deleted successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to delete student", 500, error);
  }
}
