import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";


export async function GET(req, { params }) {

    try {

        const { path: filePath } = await params;


        const fullPath = path.join(
            process.cwd(),
            "uploads",
            ...filePath
        );


        const file = await fs.readFile(fullPath);


        return new NextResponse(file, {

            headers: {

                "Content-Type": getContentType(fullPath),

                "Cache-Control":
                    "public, max-age=0"

            }

        });


    } catch(error) {

        return new NextResponse(
            "File not found",
            {
                status:404
            }
        );

    }

}


function getContentType(file){

    if(file.endsWith(".pdf"))
        return "application/pdf";


    if(file.endsWith(".ppt"))
        return "application/vnd.ms-powerpoint";


    if(file.endsWith(".pptx"))
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";


    if(file.endsWith(".mp4"))
        return "video/mp4";


    if(file.endsWith(".jpg") || file.endsWith(".jpeg"))
        return "image/jpeg";


    if(file.endsWith(".png"))
        return "image/png";


    return "application/octet-stream";

}