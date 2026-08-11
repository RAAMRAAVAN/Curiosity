import { ApiResponse } from "@/utils/apiResponse";
import { getUserFromRequest } from "@/server/auth";
import { prisma } from "@/server/prisma";
import { canAccessAdminArea } from "@/lib/roleAccess";

function getProfile(user) {
  return (
    user.teacher ||
    user.student ||
    user.admin ||
    user.management ||
    user.parent ||
    {}
  );
}

export async function GET(req) {
  const authUser = getUserFromRequest(req);

  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    include: {
      center: true,
      teacher: {
        include: {
          center: true,
        },
      },
      student: {
        include: {
          center: true,
        },
      },
      admin: {
        include: {
          center: true,
        },
      },
      management: {
        include: {
          center: true,
        },
      },
      parent: {
        include: {
          center: true,
        },
      },
    },
  });

  if (!user) {
    return ApiResponse.error("Unauthorized", 401);
  }

  const profile = getProfile(user);
  const resolvedCenterId = profile.centerId || user.centerId || null;
  const resolvedCenterName = profile.center?.name || user.center?.name || null;

  return ApiResponse.success(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: resolvedCenterId,
      centerName: resolvedCenterName,
      dob: profile.dob,
      gender: profile.gender,
      phone: profile.phone,
      address: profile.address,
      schoolName: profile.schoolName,
      studyingClass: profile.studyingClass,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    "Admin authenticated"
  );
}
