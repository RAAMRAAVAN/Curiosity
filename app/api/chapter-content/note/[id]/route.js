import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';


// ===================== GET =====================
// Fetch single note

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

                    note: true

                }

            });



        if (!content) {

            return ApiResponse.error(
                "Content not found",
                404
            );

        }



        if (content.type !== "NOTE") {

            return ApiResponse.error(
                "Requested content is not a note",
                400
            );

        }



        return ApiResponse.success(

            content,

            "Note fetched successfully"

        );


    }
    catch (err) {

        console.error(
            "Fetch Note Error:",
            err
        );


        return ApiResponse.error(
            "Unable to fetch note",
            500,
            err
        );

    }

}

// ===================== PUT =====================
// Update note

export async function PATCH(req, { params }) {
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
            notes,
            displayOrder,
            status,
            modifiedBy
        } = body;
        // Check content exists

        const existing =
            await prisma.chapterContent.findUnique({

                where: {
                    id
                },

                include: {
                    note: true
                }
            });

        if (!existing) {

            return ApiResponse.error(
                "Content not found",
                404
            );
        }
        if (existing.type !== "NOTE") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }
        const result =
            await prisma.$transaction(async (tx) => {


                // Update parent

                const content =
                    await tx.chapterContent.update({

                        where: {
                            id
                        },

                        data: {


                            ...(title && {
                                title: title.trim()
                            }),


                            ...(displayOrder && {
                                displayOrder
                            }),


                            ...(status !== undefined && {
                                status
                            }),


                            modifiedBy

                        }

                    });
                // Update note

                const note =
                    await tx.chapterNote.update({

                        where: {
                            contentId: id
                        },

                        data: {

                            ...(notes && {
                                notes
                            })

                        }

                    });



                return {

                    ...content,

                    note

                };

            });

        return ApiResponse.success(

            result,

            "Note updated successfully"

        );
    }
    catch (err) {
        console.error(
            "Update Note Error:",
            err
        );


        return ApiResponse.error(
            "Unable to update note",
            500,
            err
        );

    }

}

// ===================== DELETE =====================
// Delete note

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

                where: {
                    id
                },

                select: {
                    type: true
                }

            });



        if (!content) {

            return ApiResponse.error(
                "Content not found",
                404
            );

        }



        if (content.type !== "NOTE") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }



        await prisma.chapterContent.delete({

            where: {
                id
            }

        });



        return ApiResponse.success(

            null,

            "Note deleted successfully"

        );


    }
    catch (err) {


        console.error(
            "Delete Note Error:",
            err
        );


        return ApiResponse.error(

            "Unable to delete note",

            500,

            err

        );

    }

}