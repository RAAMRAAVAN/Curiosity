import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { promises as fs } from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public", "Class");

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

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const record = await prisma.class.findUnique({
      where: { id },
    });

    if (!record) {
      return ApiResponse.error("Class not found", 404);
    }

    return ApiResponse.success(record);
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to load class", 500, err);
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const className = formData.get("className")?.toString()?.trim();
    const iconFile = formData.get("icon");

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) {
      return ApiResponse.error("Class not found", 404);
    }

    let iconPath = existing.icon;

    if (iconFile && typeof iconFile === "object" && "name" in iconFile) {
      await ensureUploadDir();
      const fileName = getFileName(iconFile.name);
      const buffer = Buffer.from(await iconFile.arrayBuffer());
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      iconPath = `/Class/${fileName}`;
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        className: className || existing.className,
        icon: iconPath,
      },
    });

    return ApiResponse.success(updated, "Class updated");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to update class", 500, err);
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.class.delete({ where: { id } });
    return ApiResponse.success(null, "Class deleted");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to delete class", 500, err);
  }
}
