import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';
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

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'students.view');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const teacherRole = auth.actor.isTeacher;
    let scopedCenterId = null;

    if (teacherRole) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { centerId: true },
      });

      scopedCenterId = teacherProfile?.centerId || null;
    }

    let [users, classes] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "STUDENT",
          ...(teacherRole
            ? {
                student: {
                  centerId: scopedCenterId || "__NO_CENTER__",
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

    if (body.studyingClass) {
      const selectedClass = await prisma.class.findUnique({
        where: { id: body.studyingClass },
        select: { id: true, centerId: true },
      });

      if (!selectedClass) {
        return ApiResponse.error("Selected class does not exist", 400);
      }

      if (finalCenterId && selectedClass.centerId && selectedClass.centerId !== finalCenterId) {
        return ApiResponse.error("Selected class is outside the allowed center", 403);
      }
    }

    const baseEmail = body.name
      .trim()
      .toLowerCase()
      .split(/\s+/)[0];
    const generatedEmail = `${baseEmail}@curiosity.com`;
    const generatedPassword = "123456";

    let email = generatedEmail;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { email } })) {
      email = `${baseEmail}${counter}@curiosity.com`;
      counter += 1;
    }

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        password: hashedPassword,
        role: "STUDENT",
        centerId: finalCenterId,
        status: body.status !== undefined ? Boolean(body.status) : true,
        student: {
          create: {
            centerId: finalCenterId,
            studyingClass: body.studyingClass || null,
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

    return ApiResponse.success(mapStudent(user), "Student created successfully.");
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to create student", 500, error);
  }
}
