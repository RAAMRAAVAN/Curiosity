import fs from "fs/promises";
import path from "path";

const MAX_SIZE = 200 * 1024; // 200KB

export async function uploadFile(file, folder = "uploads") {
  if (!file) return null;

  if (file.size > MAX_SIZE) {
    throw new Error("Image size must not exceed 200KB.");
  }

  // Allow only image files
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    folder
  );

  // Create folder if it doesn't exist
  await fs.mkdir(uploadDir, {
    recursive: true,
  });

  const extension = path.extname(file.name);

  const fileName =
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 8) +
    extension;

  const filePath = path.join(uploadDir, fileName);

  const bytes = await file.arrayBuffer();

  await fs.writeFile(filePath, Buffer.from(bytes));

  return `/uploads/${folder}/${fileName}`;
}