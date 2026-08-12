import * as XLSX from "xlsx";
import { prisma } from "@/server/prisma";
import { ApiResponse } from "@/utils/apiResponse";
import { requireAdminPermission } from '@/lib/adminRbac';

function formatDateForExport(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'teachers.export');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const teacherRole = auth.actor.isTeacher;
    const adminOrManagement = auth.actor.isAdmin || auth.actor.isManagement;

    let scopedCenterId = null;
    if (teacherRole) {
      const teacherProfile = await prisma.teacher.findUnique({
        where: { userId: auth.actor.userId },
        select: { centerId: true },
      });

      if (!teacherProfile?.centerId) {
        return ApiResponse.error("Teacher account is not mapped to any center.", 400);
      }

      scopedCenterId = teacherProfile.centerId;
    }

    let teachers = await prisma.teacher.findMany({
      where: teacherRole ? { centerId: scopedCenterId } : undefined,
      include: {
        user: true,
        center: true,
      },
    });

    if (!teacherRole && !auth.actor.isAdmin) {
      teachers = teachers.filter((teacher) => auth.actor.canAccessCenter(teacher.centerId));
    }

    const rows = teachers.map((teacher) => ({
      Name: teacher.user?.name || teacher.name || "",
      Email: teacher.user?.email || "",
      "Center Name": teacher.center?.name || "",
      DOB: formatDateForExport(teacher.dob),
      Gender: teacher.gender || "",
      Phone: teacher.phone || "",
      Address: teacher.address || "",
      Status: teacher.status ? "Active" : "Inactive",
    }));

    if (adminOrManagement) {
      rows.sort((a, b) => {
        const centerCompare = String(a["Center Name"] || "").localeCompare(String(b["Center Name"] || ""));
        if (centerCompare !== 0) return centerCompare;
        return String(a.Name || "").localeCompare(String(b.Name || ""));
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().split("T")[0];

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=teachers-${date}.xlsx`,
      },
    });
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to export teachers", 500, error);
  }
}
