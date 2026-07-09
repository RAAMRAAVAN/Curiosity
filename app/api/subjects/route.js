import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { promises as fs } from "fs";
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

    console.log("frontend", className);
    
    const where = {};

    // Filter by related Class table using className
    if (className) {
      where.class = {
        className,
      };
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
          },
        },
      },
      orderBy: {
        subjectName: "asc",
      },
    });

    // Flatten the response
    const result = subjects.map(({ class: cls, ...subject }) => ({
      ...subject,
      className: cls.className,
    }));

    return ApiResponse.success(result);
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to load subjects", 500, err);
  }
}

// ===================== POST =====================

// export async function POST(req) {
//   try {
//     const formData = await req.formData();

//     const subjectName = formData.get("subjectName")?.toString().trim();
//     const classId = formData.get("classId")?.toString().trim();
//     const iconFile = formData.get("icon");

//     if (!subjectName)
//       return ApiResponse.error("Subject name is required", 400);

//     if (!classId)
//       return ApiResponse.error("Class is required", 400);

//     // Verify class exists
//     const classExists = await prisma.class.findUnique({
//       where: {
//         id: classId,
//       },
//     });

//     if (!classExists) {
//       return ApiResponse.error("Invalid Class", 404);
//     }

//     // Prevent duplicate subject within the same class
//     const alreadyExists = await prisma.subject.findFirst({
//       where: {
//         classId,
//         subjectName,
//       },
//     });

//     if (alreadyExists) {
//       return ApiResponse.error(
//         "Subject already exists for this class",
//         400
//       );
//     }

//     let iconPath = null;

//     if (iconFile && typeof iconFile === "object" && "name" in iconFile) {
//       await ensureUploadDir();

//       const fileName = getFileName(iconFile.name);

//       const buffer = Buffer.from(await iconFile.arrayBuffer());

//       await fs.writeFile(
//         path.join(uploadDir, fileName),
//         buffer
//       );

//       iconPath = `/Subject/${fileName}`;
//     }

//     const subject = await prisma.subject.create({
//       data: {
//         subjectName,
//         icon: iconPath,
//         classId,
//       },
//       include: {
//         class: true,
//       },
//     });

//     return ApiResponse.success(subject, "Subject created");
//   } catch (err) {
//     console.error(err);
//     return ApiResponse.error("Unable to create subject", 500, err);
//   }
// }

export async function POST(req) {
  try {
    const body = await req.json();

    const { classId, subjects } = body;

    if (!classId)
      return ApiResponse.error("Class is required", 400);

    if (!Array.isArray(subjects) || subjects.length === 0)
      return ApiResponse.error("Subjects array is required", 400);

    // Check class exists
    const classExists = await prisma.class.findUnique({
      where: {
        id: classId,
      },
    });

    if (!classExists) {
      return ApiResponse.error("Invalid Class", 404);
    }

    // Remove empty names
    const cleanedSubjects = subjects
      .filter(
        (s) =>
          s.subjectName &&
          s.subjectName.toString().trim() !== ""
      )
      .map((s) => ({
        subjectName: s.subjectName.trim(),
        icon: s.icon || null,
      }));

    if (cleanedSubjects.length === 0)
      return ApiResponse.error("No valid subjects found", 400);

    // Remove duplicates from request
    const uniqueSubjects = [
      ...new Map(
        cleanedSubjects.map((item) => [
          item.subjectName.toLowerCase(),
          item,
        ])
      ).values(),
    ];

    // Existing subjects in database
    const existingSubjects = await prisma.subject.findMany({
      where: {
        classId,
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
      (s) => !existingSet.has(s.subjectName.toLowerCase())
    );

    if (newSubjects.length === 0) {
      return ApiResponse.error(
        "All subjects already exist",
        400
      );
    }

    await prisma.subject.createMany({
      data: newSubjects.map((s) => ({
        subjectName: s.subjectName,
        icon: s.icon,
        classId,
      })),
    });

    const createdSubjects = await prisma.subject.findMany({
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