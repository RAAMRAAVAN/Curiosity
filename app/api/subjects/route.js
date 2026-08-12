import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { promises as fs } from "fs";
import { uploadFile } from "@/lib/uploadFile";
import { buildClassSlug } from "@/lib/classSlug";
import path from "path";
import { getUserFromRequest } from '@/server/auth';
import { requireAdminPermission } from '@/lib/adminRbac';

const uploadDir = path.join(process.cwd(), "public", "Subject");

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

function getFileName(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  const base = (originalName || "icon")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .toLowerCase();

  return `${Date.now()}-${base || "icon"}${ext || ".png"}`;
}

// ===================== GET =====================

export async function GET(req) {
  try {
    const authUser = getUserFromRequest(req);
    const role = String(authUser?.role || '').toUpperCase();
    if (authUser && ['ADMIN', 'MANAGEMENT', 'TEACHER'].includes(role)) {
      const auth = await requireAdminPermission(req, 'subjects.view');
      if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
      }
    }

    const { searchParams } = new URL(req.url);

    const classID = searchParams.get("classID");

    const where = {};

    if (classID) {
      where.classId = classID;
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
            icon: true,
          },
        },
      },
      orderBy: {
        subjectName: "asc",
      },
    });

    const result = subjects.map(({ class: cls, ...subject }) => ({
      ...subject,
      className: cls.className,
      classIcon: cls.icon,
    }));

    return ApiResponse.success(result);
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to load subjects", 500, err);
  }
}

// ===================== POST =====================

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'subjects.create');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const formData = await req.formData();

    const className = formData.get("className");
    const classIdValue = formData.get("classId");
    const subjectsData = formData.get("subjects");

    if (!classIdValue && (!className || !className.trim())) {
      return ApiResponse.error("Class ID or Class Name is required", 400);
    }

    if (!subjectsData) {
      return ApiResponse.error("Subjects are required", 400);
    }

    let subjects;

    try {
      subjects = JSON.parse(subjectsData);
    } catch {
      return ApiResponse.error("Invalid subjects data", 400);
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return ApiResponse.error("Subjects array is required", 400);
    }

    let classData;
    let classId;

    if (classIdValue) {
      const classIdString = classIdValue.toString().trim();
      if (!classIdString) {
        return ApiResponse.error("Invalid Class ID", 400);
      }

      classData = await prisma.class.findUnique({
        where: {
          id: classIdString,
        },
      });

      if (classData) {
        classId = classData.id;
      }
    }

    if (!classData) {
      classData = await prisma.class.findUnique({
        where: {
          className: className.trim(),
        },
      });

      if (!classData) {
        return ApiResponse.error("Invalid Class", 404);
      }

      classId = classData.id;
    }

    // Upload images
    const processedSubjects = [];

    for (let i = 0; i < subjects.length; i++) {
      const item = subjects[i];

      if (!item.subjectName?.trim()) continue;

      let icon = null;

      const file = formData.get(`icon${i}`);

      if (file && file.size > 0) {
        icon = await uploadFile(file, "subjects");
      }

      processedSubjects.push({
        subjectName: item.subjectName.trim(),
        icon,
      });
    }

    if (processedSubjects.length === 0) {
      return ApiResponse.error(
        "No valid subjects found",
        400
      );
    }

    // Remove duplicate names from request
    const uniqueSubjects = [
      ...new Map(
        processedSubjects.map((item) => [
          item.subjectName.toLowerCase(),
          item,
        ])
      ).values(),
    ];

    // Existing Subjects
    const existingSubjects = await prisma.subject.findMany({
      where: {
        classId,
        subjectName: {
          in: uniqueSubjects.map(
            (s) => s.subjectName
          ),
        },
      },
      select: {
        subjectName: true,
      },
    });

    const existingSet = new Set(
      existingSubjects.map((s) =>
        s.subjectName.toLowerCase()
      )
    );

    const newSubjects = uniqueSubjects.filter(
      (s) =>
        !existingSet.has(
          s.subjectName.toLowerCase()
        )
    );

    if (newSubjects.length === 0) {
      return ApiResponse.error(
        "All subjects already exist",
        400
      );
    }

    // Save Subjects
    await prisma.subject.createMany({
      data: newSubjects.map((s) => ({
        classId,
        subjectName: s.subjectName,
        icon: s.icon,
      })),
      skipDuplicates: true,
    });

    const createdSubjects =
      await prisma.subject.findMany({
        where: {
          classId,
        },
        include: {
          class: true,
        },
        orderBy: {
          subjectName: "asc",
        },
      });

    return ApiResponse.success(
      createdSubjects,
      `${newSubjects.length} subject(s) created successfully`
    );
  } catch (err) {
    console.error(err);

    return ApiResponse.error(
      "Unable to create subjects",
      500,
      err
    );
  }
}