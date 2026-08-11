import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea, isTeacher } from "@/lib/roleAccess";
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
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const teacherRole = isTeacher(authUser);
    let scopedCenterId = null;

    if (teacherRole) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: authUser.id },
        select: { centerId: true },
      });

      scopedCenterId = teacherProfile?.centerId || null;
    }

    const [users, classes] = await Promise.all([
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
      prisma.class.findMany({ select: { id: true, className: true } }),
    ]);

    const classMap = Object.fromEntries(classes.map((cls) => [cls.id, cls.className]));

    return ApiResponse.success(users.map((user) => mapStudent(user, classMap)));
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to load students", 500, error);
  }
}

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    if (!body.name) {
      return ApiResponse.error("Name is required", 400);
    }

    let finalCenterId = body.centerId || null;
    if (isTeacher(authUser)) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: authUser.id },
        select: { centerId: true },
      });

      if (!teacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      finalCenterId = teacherProfile.centerId;
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
