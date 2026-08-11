import * as XLSX from "xlsx";
import { prisma } from "@/server/prisma";
import { getUserFromRequest } from "@/server/auth";
import { ApiResponse } from "@/utils/apiResponse";
import { canAccessAdminArea, canManageAdminData, isTeacher } from "@/lib/roleAccess";

function formatDateForExport(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export async function GET(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser || !canAccessAdminArea(authUser)) {
    return ApiResponse.error("Unauthorized", 401);
  }

  try {
    const teacherRole = isTeacher(authUser);
    const adminOrManagement = canManageAdminData(authUser);

    let scopedCenterId = null;
    if (teacherRole) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: authUser.id },
        select: { centerId: true },
      });

      if (!teacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      scopedCenterId = teacherProfile.centerId;
    }

    const [users, classes] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "STUDENT",
          ...(teacherRole
            ? {
                student: {
                  centerId: scopedCenterId,
                },
              }
            : {}),
        },
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

    const classMap = Object.fromEntries(classes.map((item) => [item.id, item.className]));

    const rows = users.map((user) => {
      const profile = user.student || {};
      const className = profile.studyingClass
        ? classMap[profile.studyingClass] || profile.studyingClass
        : "";

      return {
        Name: user.name || "",
        Email: user.email || "",
        "Center Name": profile.center?.name || "",
        "Class Name": className || "",
        DOB: formatDateForExport(profile.dob),
        Gender: profile.gender || "",
        Phone: profile.phone || "",
        Address: profile.address || "",
        "School Name": profile.schoolName || "",
        Status: user.status ? "Active" : "Inactive",
      };
    });

    if (adminOrManagement) {
      rows.sort((a, b) => {
        const centerCompare = String(a["Center Name"] || "").localeCompare(String(b["Center Name"] || ""));
        if (centerCompare !== 0) return centerCompare;
        return String(a.Name || "").localeCompare(String(b.Name || ""));
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().split("T")[0];

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=students-${date}.xlsx`,
      },
    });
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to export students", 500, error);
  }
}
