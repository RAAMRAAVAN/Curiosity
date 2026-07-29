import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const classes = await prisma.class.findMany();

    const sortedClasses = [...classes].sort((a, b) => {
      const aValue = String(a.className || "");
      const bValue = String(b.className || "");
      const aNum = Number.parseInt(aValue, 10);
      const bNum = Number.parseInt(bValue, 10);

      const aHasNumber = !Number.isNaN(aNum) && /\d/.test(aValue);
      const bHasNumber = !Number.isNaN(bNum) && /\d/.test(bValue);

      if (aHasNumber && bHasNumber) {
        return aNum - bNum;
      }

      return aValue.localeCompare(bValue, undefined, { sensitivity: "base" });
    });

    return ApiResponse.success(sortedClasses);
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to load classes", 500, err);
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const className = formData.get("className")?.toString()?.trim();
    const iconFile = formData.get("icon");

    if (!className) {
      return ApiResponse.error("className is required", 400);
    }

    let iconPath = null;

    if (iconFile && typeof iconFile === "object" && "name" in iconFile) {
      await ensureUploadDir();
      const fileName = getFileName(iconFile.name);
      const buffer = Buffer.from(await iconFile.arrayBuffer());
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      iconPath = `/Class/${fileName}`;
    }

    const created = await prisma.class.create({
      data: {
        className,
        icon: iconPath,
      },
    });

    return ApiResponse.success(created, "Class created");
  } catch (err) {
    console.error(err);
    return ApiResponse.error("Unable to create class", 500, err);
  }
}
