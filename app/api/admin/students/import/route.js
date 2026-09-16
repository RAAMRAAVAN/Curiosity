import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from "@/lib/adminRbac";
import { ApiResponse } from "@/utils/apiResponse";
import { nextStudentId } from "@/lib/studentId";
import { getTeacherAssignedClassIds } from "@/lib/teacherClassAccess";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_GENDERS = new Set(["Male", "Female", "Other", "Prefer not to say"]);

function text(value) {
  return String(value ?? "").trim();
}

function parseDate(value) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseStatus(value) {
  const raw = text(value).toLowerCase();
  if (!raw || raw === "active" || raw === "true" || raw === "1") return true;
  if (raw === "inactive" || raw === "false" || raw === "0") return false;
  return null;
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, "students.create");
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return ApiResponse.error("Please upload an Excel file.", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return ApiResponse.error("Excel file must be 10 MB or smaller.", 400);
    }

    const fileName = String(file.name || "").toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return ApiResponse.error("Only .xlsx or .xls files are supported.", 400);
    }

    const [centers, classes] = await Promise.all([
      prisma.center.findMany({ where: { status: true }, select: { id: true, name: true, slug: true } }),
      prisma.class.findMany({ where: { status: true }, select: { id: true, className: true, centerId: true } }),
    ]);
    const visibleCenters = auth.actor.isAdmin
      ? centers
      : centers.filter((center) => auth.actor.canAccessCenter(center.id));
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
    const centerByName = new Map(visibleCenters.map((center) => [center.name.trim().toLowerCase(), center]));
    const classByName = new Map(visibleClasses.map((item) => [item.className.trim().toLowerCase(), item]));

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer", cellDates: true, raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return ApiResponse.error("The workbook has no Students sheet.", 400);
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    if (!rows.length) return ApiResponse.error("The uploaded Students sheet is empty.", 400);
    if (rows.length > 500) return ApiResponse.error("You can import a maximum of 500 students at a time.", 400);

    const errors = [];
    const preparedRows = [];
    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const name = text(row.Name);
      const centerName = text(row.Center);
      const className = text(row.Class);
      const gender = text(row.Gender);
      const status = parseStatus(row.Status);
      const dobValue = text(row.DOB);
      const dob = parseDate(row.DOB);
      const center = centerByName.get(centerName.toLowerCase());
      const selectedClass = classByName.get(className.toLowerCase());
      const rowErrors = [];

      if (!name) rowErrors.push("Name is required");
      if (!center) rowErrors.push(`Center "${centerName}" was not found or is not assigned to you`);
      if (!selectedClass) rowErrors.push(`Class "${className}" was not found or is not assigned to you`);
      if (center && selectedClass && selectedClass.centerId && selectedClass.centerId !== center.id) {
        rowErrors.push(`Class "${className}" is not assigned to center "${center.name}"`);
      }
      if (dobValue && !dob) rowErrors.push("DOB is invalid");
      if (gender && !ALLOWED_GENDERS.has(gender)) rowErrors.push("Gender is invalid");
      if (text(row.Status) && status === null) rowErrors.push("Status must be Active or Inactive");

      if (rowErrors.length) {
        errors.push(`Row ${rowNumber}: ${rowErrors.join("; ")}`);
      } else {
        preparedRows.push({
          name,
          center,
          selectedClass,
          dob,
          gender: gender || null,
          schoolName: text(row["School Name"]) || null,
          teaGarden: text(row["Tea Garden"]) || null,
          guardianName: text(row["Guardian Name"]) || null,
          status: status ?? true,
        });
      }
    });

    if (errors.length) {
      return ApiResponse.error("The Excel file contains errors. No students were imported.", 400, errors);
    }

    const generatedPassword = "123456";
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const created = await prisma.$transaction(async (tx) => {
      const result = [];
      for (const row of preparedRows) {
        const baseEmail = row.name.trim().toLowerCase().split(/\s+/)[0] || "student";
        let email = `${baseEmail}@curiosity.com`;
        let counter = 1;
        while (await tx.user.findUnique({ where: { email } })) {
          email = `${baseEmail}${counter}@curiosity.com`;
          counter += 1;
        }

        const studentId = await nextStudentId(tx, row.center.slug, row.selectedClass.className);
        const user = await tx.user.create({
          data: {
            id: studentId,
            name: row.name,
            email,
            password: hashedPassword,
            role: "STUDENT",
            centerId: row.center.id,
            status: row.status,
            student: {
              create: {
                centerId: row.center.id,
                studyingClass: row.selectedClass.id,
                dob: row.dob,
                gender: row.gender,
                schoolName: row.schoolName,
                teaGarden: row.teaGarden,
                guardianName: row.guardianName,
              },
            },
          },
          select: { id: true },
        });
        result.push(user.id);
      }
      return result;
    });

    return ApiResponse.success({ count: created.length }, `${created.length} student(s) imported successfully.`);
  } catch (error) {
    console.error(error);
    return ApiResponse.error("Unable to import students", 500);
  }
}
