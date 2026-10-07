import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';
import bcrypt from "bcryptjs";
import { nextStudentId } from "@/lib/studentId";
import { getTeacherAssignedClassIds } from "@/lib/teacherClassAccess";
import { createStudentIdentityKey, isStudentIdentityTaken } from "@/lib/studentIdentity";
import { buildPaginationMeta, containsFilter, parsePagination } from "@/lib/pagination";

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

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'students.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const teacherRole = auth.actor.isTeacher;
    let scopedCenterId = null;
    let assignedClassIds = null;

    if (teacherRole) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { centerId: true },
      });

      scopedCenterId = teacherProfile?.centerId || null;
      assignedClassIds = await getTeacherAssignedClassIds(prisma, auth.actor.userId);
    }

    const pagination = parsePagination(req);
    if (pagination) {
      const centerId = pagination.params.get('centerId');
      const classId = pagination.params.get('classId');
      const studentWhere = {
        ...(teacherRole
          ? { centerId: scopedCenterId || "__NO_CENTER__", ...(assignedClassIds ? { studyingClass: { in: assignedClassIds } } : {}) }
          : auth.actor.isAdmin ? {} : { centerId: { in: auth.actor.assignedCenterIds.length ? auth.actor.assignedCenterIds : ["__NO_CENTER__"] } }),
        ...(centerId && (auth.actor.isAdmin || teacherRole || auth.actor.canAccessCenter(centerId)) ? { centerId } : {}),
        ...(classId ? { studyingClass: classId } : {}),
      };
      const term = containsFilter(pagination.search);
      const where = {
        role: "STUDENT",
        student: studentWhere,
        ...(pagination.search ? {
          OR: [
            { id: term },
            { name: term },
            { email: term },
            { student: { is: { phone: term } } },
            { student: { is: { schoolName: term } } },
            { student: { is: { fatherName: term } } },
            { student: { is: { motherName: term } } },
            { student: { is: { teaGarden: term } } },
            { student: { is: { center: { name: term } } } },
          ],
        } : {}),
      };
      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: { student: { include: { center: true } } },
          skip: pagination.skip,
          take: pagination.take,
        }),
      ]);
      const classIds = [...new Set(users.map((user) => user.student?.studyingClass).filter(Boolean))];
      const classes = classIds.length
        ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, className: true } })
        : [];
      const classMap = Object.fromEntries(classes.map((cls) => [cls.id, cls.className]));
      return ApiResponse.paginated(users.map((user) => mapStudent(user, classMap)), buildPaginationMeta(total, pagination));
    }

    let [users, classes] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "STUDENT",
          ...(teacherRole
            ? {
                student: {
                  centerId: scopedCenterId || "__NO_CENTER__",
                  ...(assignedClassIds ? { studyingClass: { in: assignedClassIds } } : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            include: {
              center: true,
            },
          },
        },
      }),
      prisma.class.findMany({ select: { id: true, className: true, centerId: true } }),
    ]);

    if (!teacherRole && !auth.actor.isAdmin) {
      users = users.filter((user) => auth.actor.canAccessCenter(user.student?.centerId));
      classes = classes.filter((item) => auth.actor.canAccessCenter(item.centerId));
    }

    const classMap = Object.fromEntries(classes.map((cls) => [cls.id, cls.className]));

    return ApiResponse.success(users.map((user) => mapStudent(user, classMap)));
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load students", 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'students.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const fatherName = String(body.fatherName ?? body.guardianName ?? '').trim();
    const motherName = String(body.motherName || '').trim();
    const studyingClass = String(body.studyingClass || '').trim();
    const dobValue = String(body.dob || '').trim();
    const dob = dobValue ? new Date(dobValue) : null;
    const gender = String(body.gender || '').trim();
    const missingFields = [
      ['Full Name', name],
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

    let finalCenterId = String(body.centerId || '').trim() || null;
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

    if (!finalCenterId) {
      return ApiResponse.error("Please select a Center.", 400);
    }

    const center = finalCenterId
      ? await prisma.center.findUnique({
          where: { id: finalCenterId },
          select: { slug: true },
        })
      : null;

    if (finalCenterId && !center) {
      return ApiResponse.error("Selected center does not exist", 400);
    }

    const selectedClass = await prisma.class.findUnique({
      where: { id: studyingClass },
      select: { id: true, centerId: true, className: true },
    });

    if (!selectedClass) {
      return ApiResponse.error("Selected class does not exist", 400);
    }

    if (finalCenterId && selectedClass.centerId && selectedClass.centerId !== finalCenterId) {
      return ApiResponse.error("Selected class is outside the allowed center", 403);
    }

    if (auth.actor.isTeacher) {
      const assignedClassIds = await getTeacherAssignedClassIds(prisma, auth.actor.userId);
      if (assignedClassIds && !assignedClassIds.includes(selectedClass.id)) {
        return ApiResponse.error("Selected class is not assigned to you", 403);
      }
    }

    const identityKey = createStudentIdentityKey({ name, fatherName, motherName });
    if (await isStudentIdentityTaken(prisma, identityKey)) {
      return ApiResponse.error("A student with this Full Name, Father's Name, and Mother's Name already exists.", 409);
    }

    const baseEmail = name
      .toLowerCase()
      .split(/\s+/)[0];
    const generatedEmail = `${baseEmail}@curiosity.com`;
    const generatedPassword = "123456";

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const user = await prisma.$transaction(async (tx) => {
      let email = generatedEmail;
      let counter = 1;
      while (await tx.user.findUnique({ where: { email } })) {
        email = `${baseEmail}${counter}@curiosity.com`;
        counter += 1;
      }

      const studentId = await nextStudentId(tx, center.slug, selectedClass.className);

      return tx.user.create({
        data: {
          ...(studentId ? { id: studentId } : {}),
          name,
          email,
          password: hashedPassword,
          role: "STUDENT",
          centerId: finalCenterId,
          status: body.status !== undefined ? Boolean(body.status) : true,
          student: {
            create: {
              centerId: finalCenterId,
              studyingClass,
              dob,
              gender,
              schoolName: body.schoolName?.trim() || null,
              teaGarden: body.teaGarden?.trim() || null,
              fatherName,
              motherName,
              identityKey,
            },
          },
        },
        include: {
          student: {
            include: {
              center: true,
            },
          },
        },
      });
    });

    return ApiResponse.success(mapStudent(user), "Student created successfully.");
  } catch (error) {
    if (error?.code === 'P2002' && String(error?.meta?.target || '').includes('identity_key')) {
      return ApiResponse.error("A student with this Full Name, Father's Name, and Mother's Name already exists.", 409);
    }
    console.error(error);
    return ApiResponse.error("Unable to create student", 500, error);
  }
}
