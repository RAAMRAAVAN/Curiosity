import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";

import fs from "fs/promises";
import path from "path";



// ===================== GET =====================
// Fetch single PDF

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

                    pdf: true

                }

            });




        if (!content) {

            return ApiResponse.error(
                "PDF content not found",
                404
            );

        }



        if (content.type !== "PDF") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }




        return ApiResponse.success(

            content,

            "PDF fetched successfully"

        );



    }
    catch (err) {


        console.error(
            "Fetch PDF Error:",
            err
        );


        return ApiResponse.error(

            "Unable to fetch PDF",

            500,

            err

        );

    }

}







// ===================== PUT =====================
// Update PDF

export async function PUT(req, { params }) {


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


        if (
            title !== undefined &&
            !title.trim()
        ) {

            return ApiResponse.error(
                "PDF title is required",
                400
            );

        }



        const existing =
            await prisma.chapterContent.findUnique({

                where: {
                    id
                },

                include: {
                    pdf: true
                }

            });

        const oldFilePath = existing.pdf?.filePath;



        if (!existing) {

            return ApiResponse.error(
                "PDF content not found",
                404
            );

        }





        if (existing.type !== "PDF") {


            return ApiResponse.error(
                "Content type mismatch",
                400
            );


        }

        const result = await prisma.$transaction(async (tx) => {

            // ==========================
            // Handle display order change
            // ==========================

            if (
                displayOrder !== undefined &&
                displayOrder !== existing.displayOrder
            ) {

                const totalContents = await tx.chapterContent.count({
                    where: {
                        chapterId: existing.chapterId,
                    },
                });

                if (
                    displayOrder < 1 ||
                    displayOrder > 1000
                ) {
                    throw new Error("Invalid display order.");
                }

                // Moving UP
                if (displayOrder < existing.displayOrder) {

                    await tx.chapterContent.updateMany({

                        where: {

                            chapterId: existing.chapterId,

                            displayOrder: {
                                gte: displayOrder,
                                lt: existing.displayOrder,
                            },

                        },

                        data: {

                            displayOrder: {
                                increment: 1,
                            },

                        },

                    });

                }

                // Moving DOWN
                else {

                    await tx.chapterContent.updateMany({

                        where: {

                            chapterId: existing.chapterId,

                            displayOrder: {
                                gt: existing.displayOrder,
                                lte: displayOrder,
                            },

                        },

                        data: {

                            displayOrder: {
                                decrement: 1,
                            },

                        },

                    });

                }

            }

            // ==========================
            // Update Chapter Content
            // ==========================

            const content = await tx.chapterContent.update({

                where: {
                    id,
                },

                data: {

                    ...(title !== undefined && {
                        title: title.trim(),
                    }),

                    ...(displayOrder !== undefined && {
                        displayOrder,
                    }),

                    ...(status !== undefined && {
                        status,
                    }),

                    ...(modifiedBy !== undefined && {
                        modifiedBy,
                    }),

                },

            });

            // ==========================
            // Update PDF
            // ==========================

            const pdf = await tx.chapterPdf.update({

                where: {
                    contentId: id,
                },

                data: {

                    ...(fileName !== undefined && {
                        fileName,
                    }),

                    ...(filePath !== undefined && {
                        filePath,
                    }),

                    ...(fileSize !== undefined && {
                        fileSize,
                    }),

                },

            });

            return {

                ...content,

                pdf,

            };

        });

        // ==========================
        // Delete old PDF if replaced
        // ==========================

        if (
            filePath !== undefined &&
            oldFilePath &&
            oldFilePath !== filePath
        ) {

            try {

                const fullPath = path.join(
                    process.cwd(),
                    "public",
                    oldFilePath.replace(/^\/+/, "")
                );

                await fs.unlink(fullPath);

            }
            catch (err) {

                // Ignore if file doesn't exist
                if (err.code !== "ENOENT") {

                    console.error(
                        "Unable to delete old PDF:",
                        err
                    );

                }

            }

        }

        return ApiResponse.success(

            result,

            "PDF updated successfully"

        );



    }
    catch (err) {


        console.error(
            "Update PDF Error:",
            err
        );


        return ApiResponse.error(

            "Unable to update PDF",

            500,

            err

        );


    }

}







// ===================== DELETE =====================
// Delete PDF

export async function DELETE(req, { params }) {

    try {

        const { id } = await params;

        if (!id) {

            return ApiResponse.error(
                "Content ID is required",
                400
            );

        }

        const content = await prisma.chapterContent.findUnique({

            where: {
                id
            },

            include: {
                pdf: true
            }

        });

        if (!content) {

            return ApiResponse.error(
                "PDF content not found",
                404
            );

        }

        if (content.type !== "PDF") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }

        // ==========================
        // Delete physical PDF file
        // ==========================

        if (content.pdf?.filePath) {

            const filePath = path.join(
                process.cwd(),
                "public",
                content.pdf.filePath.replace(/^\/+/, "")
            );

            try {

                await fs.unlink(filePath);

            }
            catch (err) {

                // Ignore if file doesn't exist
                if (err.code !== "ENOENT") {
                    throw err;
                }

            }

        }

        // ==========================
        // Delete DB record
        // ==========================

        await prisma.chapterContent.delete({

            where: {
                id
            }

        });

        return ApiResponse.success(

            null,

            "PDF deleted successfully"

        );

    }
    catch (err) {

        console.error(
            "Delete PDF Error:",
            err
        );

        return ApiResponse.error(

            "Unable to delete PDF",

            500,

            err

        );

    }

}