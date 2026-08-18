import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(req) {

  try {

    const formData = await req.formData();

    const file = formData.get("file");

    const folder = formData.get("folder") || "uploads";


    if (!file) {

      return NextResponse.json(
        {
          success: false,
          message: "No file uploaded",
        },
        {
          status: 400,
        }
      );

    }


    // New location: outside public
    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      folder
    );


    await fs.mkdir(uploadDir, {
      recursive: true,
    });


    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);


    const ext = path.extname(file.name);


    const filename =
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 8) +
      ext;


    const filepath = path.join(
      uploadDir,
      filename
    );


    await fs.writeFile(
      filepath,
      buffer
    );


    return NextResponse.json({

      success: true,

      // New URL
      path:
        `/api/files/${folder}/${filename}`

    });


  } catch (err) {

    // console.log(err);


    return NextResponse.json(
      {
        success: false,
        message: "Upload failed",
      },
      {
        status: 500,
      }
    );

  }

}