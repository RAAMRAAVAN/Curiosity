import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";


// ===================== POST =====================
// Create Chapter Note

export async function POST(req) {

    try {

        const body = await req.json();


        const {
            chapterId,
            title,
            notes,
            displayOrder,
            createdBy
        } = body;



        // Validation

        if (!chapterId) {

            return ApiResponse.error(
                "Chapter ID is required",
                400
            );

        }


        if (!title || !title.trim()) {

            return ApiResponse.error(
                "Title is required",
                400
            );

        }


        if (!notes || !notes.trim()) {

            return ApiResponse.error(
                "Notes content is required",
                400
            );

        }



        // Check Chapter Exists

        const chapter = await prisma.chapter.findUnique({

            where:{
                id: chapterId
            },

            select:{
                id:true
            }

        });



        if(!chapter){

            return ApiResponse.error(
                "Chapter not found",
                404
            );

        }



        // Transaction

        const result = await prisma.$transaction(async (tx) => {

    // Get last display order for this chapter
    const lastContent = await tx.chapterContent.findFirst({
        where: {
            chapterId,
        },
        orderBy: {
            displayOrder: "desc",
        },
        select: {
            displayOrder: true,
        },
    });

    const nextDisplayOrder = lastContent
        ? lastContent.displayOrder + 1
        : 1;

    // Create Parent Content
    const content = await tx.chapterContent.create({
        data: {
            chapterId,
            type: "NOTE",
            title: title.trim(),
            displayOrder: nextDisplayOrder,
            createdBy,
        },
    });

    // Create Note
    const note = await tx.chapterNote.create({
        data: {
            contentId: content.id,
            notes,
        },
    });

    return {
        ...content,
        note,
    };

});


        return ApiResponse.success(

            result,

            "Chapter note created successfully"

        );



    }
    catch(err){


        console.error(
            "Create Note Error:",
            err
        );


        return ApiResponse.error(

            "Unable to create chapter note",

            500,

            err

        );


    }

}