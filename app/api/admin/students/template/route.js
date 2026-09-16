import ExcelJS from "exceljs";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { ApiResponse } from "@/utils/apiResponse";
import { getTeacherAssignedClassIds } from "@/lib/teacherClassAccess";

const columns = [
  { header: "Name", key: "name", width: 28 },
  { header: "Center", key: "center", width: 24 },
  { header: "Class", key: "class", width: 16 },
  { header: "DOB", key: "dob", width: 14 },
  { header: "Gender", key: "gender", width: 20 },
  { header: "School Name", key: "schoolName", width: 28 },
  { header: "Tea Garden", key: "teaGarden", width: 24 },
  { header: "Guardian Name", key: "guardianName", width: 28 },
  { header: "Status", key: "status", width: 14 },
];

export async function GET(req) {
  const auth = await requireAdminPermission(req, "students.create");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const [centers, classes] = await Promise.all([
      prisma.center.findMany({ where: { status: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.class.findMany({ where: { status: true }, select: { id: true, className: true, centerId: true }, orderBy: { className: "asc" } }),
    ]);

    const visibleCenters = auth.actor.isAdmin ? centers : centers.filter((center) => auth.actor.canAccessCenter(center.id));
    const visibleCenterIds = new Set(visibleCenters.map((center) => center.id));
    let visibleClasses = auth.actor.isAdmin
      ? classes
      : classes.filter((item) => !item.centerId || visibleCenterIds.has(item.centerId));
    if (auth.actor.isTeacher) {
      const assignedClassIds = await getTeacherAssignedClassIds(prisma, auth.actor.userId);
      if (assignedClassIds) {
        visibleClasses = visibleClasses.filter((item) => assignedClassIds.includes(item.id));
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Curiosity";
    const sheet = workbook.addWorksheet("Students");
    sheet.columns = columns;
    sheet.freezePanes = { row: 2 };
    sheet.autoFilter = "A1:I1";

    const header = sheet.getRow(1);
    header.height = 24;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFB7C3D0" } },
        bottom: { style: "thin", color: { argb: "FFB7C3D0" } },
        left: { style: "thin", color: { argb: "FFB7C3D0" } },
        right: { style: "thin", color: { argb: "FFB7C3D0" } },
      };
    });

    const lists = workbook.addWorksheet("Lists");
    lists.getRow(1).values = ["Centers", "Classes", "Genders", "Statuses"];
    visibleCenters.forEach((center, index) => { lists.getCell(`A${index + 2}`).value = center.name; });
    visibleClasses.forEach((item, index) => { lists.getCell(`B${index + 2}`).value = item.className; });
    ["Male", "Female", "Other", "Prefer not to say"].forEach((value, index) => { lists.getCell(`C${index + 2}`).value = value; });
    ["Active", "Inactive"].forEach((value, index) => { lists.getCell(`D${index + 2}`).value = value; });
    lists.state = "veryHidden";

    const lastCenterRow = Math.max(2, visibleCenters.length + 1);
    const lastClassRow = Math.max(2, visibleClasses.length + 1);
    for (let row = 2; row <= 201; row += 1) {
      sheet.getCell(`B${row}`).dataValidation = { type: "list", allowBlank: false, formulae: [`Lists!$A$2:$A$${lastCenterRow}`] };
      sheet.getCell(`C${row}`).dataValidation = { type: "list", allowBlank: false, formulae: [`Lists!$B$2:$B$${lastClassRow}`] };
      sheet.getCell(`D${row}`).numFmt = "yyyy-mm-dd";
      sheet.getCell(`D${row}`).dataValidation = { type: "date", operator: "between", allowBlank: true, formulae: ["DATE(1900,1,1)", "DATE(2100,12,31)"] };
      sheet.getCell(`E${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ["Lists!$C$2:$C$5"] };
      sheet.getCell(`I${row}`).dataValidation = { type: "list", allowBlank: true, formulae: ["Lists!$D$2:$D$3"] };
    }

    const instructions = workbook.addWorksheet("Instructions");
    instructions.getColumn(1).width = 110;
    instructions.getCell("A1").value = "Student Import Instructions";
    instructions.getCell("A1").font = { bold: true, size: 14 };
    instructions.getCell("A3").value = "Fill the Students sheet and upload it from Manage Students.";
    instructions.getCell("A4").value = "Choose Center, Class, Gender, and Status from the dropdowns.";
    instructions.getCell("A5").value = "Do not enter IDs, emails, passwords, center IDs, or class IDs. They are generated or resolved automatically.";
    instructions.getCell("A6").value = "Name, Center, and Class are required. DOB must use YYYY-MM-DD when provided.";

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=student-import-template.xlsx",
      },
    });
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to create student import template", 500);
  }
}
