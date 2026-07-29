import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { promises as fs } from "fs";
import { uploadFile } from "@/lib/uploadFile";
import { buildClassSlug } from "@/lib/classSlug";
import path from "path";

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

        const { searchParams } = new URL(req.url);

        const className = searchParams.get("className");
        const classSlug = searchParams.get("classSlug");

        const where = {};

        if (className) {
            const exactClass = await prisma.class.findFirst({
                where: {
                    OR: [
                        { className },
                        { className: { equals: className.trim(), mode: "insensitive" } },
                    ],
                },
                select: { id: true },
            });

            if (exactClass) {
                where.classId = exactClass.id;
            }
        } else if (classSlug) {
            const classes = await prisma.class.findMany({
                select: {
                    id: true,
                    className: true,
                },
            });

            const matchedClass = classes.find((item) => buildClassSlug(item.className) === classSlug);

            if (matchedClass) {
                where.classId = matchedClass.id;
            }
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



        // Flatten response
        const result = subjects.map(({ class: cls, ...subject }) => ({

            ...subject,

            className: cls.className,

            classIcon: cls.icon,

        }));


        return ApiResponse.success(result);


    } catch (err) {

        console.error(err);

        return ApiResponse.error(
            "Unable to load subjects",
            500,
            err
        );

    }
}

// ===================== POST =====================

export async function POST(req) {
  try {
    const formData = await req.formData();

    const className = formData.get("className");
    const subjectsData = formData.get("subjects");

    if (!className || !className.trim()) {
      return ApiResponse.error("Class Name is required", 400);
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

    // Find Class
    const classData = await prisma.class.findUnique({
      where: {
        className: className.trim(),
      },
    });

    if (!classData) {
      return ApiResponse.error("Invalid Class", 404);
    }

    const classId = classData.id;

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