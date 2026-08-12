import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';



// ===================== GET =====================
// Fetch single Previous Paper

export async function GET(req, { params }) {

    try {


        const { id } = await params;


        if (!id) {

            return ApiResponse.error(
                "Content ID is required",
                400
            );

        }



        const content =
            await prisma.chapterContent.findUnique({

                where: {
                    id
                },

                include: {

                    previousPaper: true

                }

            });



        if (!content) {

            return ApiResponse.error(
                "Previous paper content not found",
                404
            );

        }



        if (content.type !== "PREVIOUS_PAPER") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }



        return ApiResponse.success(
            content,
            "Previous paper fetched successfully"
        );


    }
    catch(err) {


        console.error(
            "Fetch Previous Paper Error:",
            err
        );


        return ApiResponse.error(

            "Unable to fetch previous paper",

            500,

            err

        );

    }

}








// ===================== PUT =====================
// Update Previous Paper

export async function PUT(req, { params }) {

    const auth = await requireAdminPermission(req, 'class_content.edit');
    if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
    }


    try {


        const { id } = await params;



        if (!id) {

            return ApiResponse.error(
                "Content ID is required",
                400
            );

        }



        const body = await req.json();



        const {

            title,
            fileName,
            filePath,
            fileSize,
            displayOrder,
            status,
            modifiedBy

        } = body;





        const existing =
            await prisma.chapterContent.findUnique({

                where: {
                    id
                },

                include: {

                    previousPaper:true

                }

            });





        if (!existing) {

            return ApiResponse.error(
                "Previous paper content not found",
                404
            );

        }




        if (existing.type !== "PREVIOUS_PAPER") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }





        const result =
        await prisma.$transaction(async(tx)=>{



            // Update ChapterContent

            const content =
            await tx.chapterContent.update({

                where:{
                    id
                },


                data:{


                    ...(title && {

                        title:title.trim()

                    }),



                    ...(displayOrder && {

                        displayOrder

                    }),



                    ...(status !== undefined && {

                        status

                    }),



                    ...(modifiedBy && {

                        modifiedBy

                    })


                }

            });








            // Update Previous Paper

            const previousPaper =
            await tx.chapterPreviousPaper.update({

                where:{

                    contentId:id

                },


                data:{


                    ...(fileName !== undefined && {

                        fileName

                    }),



                    ...(filePath !== undefined && {

                        filePath

                    }),



                    ...(fileSize !== undefined && {

                        fileSize

                    })


                }

            });






            return {

                ...content,

                previousPaper

            };



        });







        return ApiResponse.success(

            result,

            "Previous paper updated successfully"

        );



    }
    catch(err) {


        console.error(
            "Update Previous Paper Error:",
            err
        );


        return ApiResponse.error(

            "Unable to update previous paper",

            500,

            err

        );


    }

}










// ===================== DELETE =====================
// Delete Previous Paper

export async function DELETE(req, { params }) {

    const auth = await requireAdminPermission(req, 'class_content.edit');
    if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
    }


    try {


        const { id } = await params;



        if (!id) {

            return ApiResponse.error(
                "Content ID is required",
                400
            );

        }





        const content =
            await prisma.chapterContent.findUnique({

                where:{
                    id
                },

                select:{
                    type:true
                }

            });





        if (!content) {

            return ApiResponse.error(
                "Previous paper content not found",
                404
            );

        }





        if (content.type !== "PREVIOUS_PAPER") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }





        await prisma.chapterContent.delete({

            where:{
                id
            }

        });







        return ApiResponse.success(

            null,

            "Previous paper deleted successfully"

        );



    }
    catch(err) {


        console.error(
            "Delete Previous Paper Error:",
            err
        );


        return ApiResponse.error(

            "Unable to delete previous paper",

            500,

            err

        );


    }

}