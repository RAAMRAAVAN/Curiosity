import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

import fs from "fs/promises";
import path from "path";

// ===================== GET =====================
// Fetch single PPT

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

                    ppt: true

                }

            });



        if (!content) {

            return ApiResponse.error(
                "PPT content not found",
                404
            );

        }



        if (content.type !== "PPT") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }



        return ApiResponse.success(
            content,
            "PPT fetched successfully"
        );


    }
    catch(err) {


        console.error(
            "Fetch PPT Error:",
            err
        );


        return ApiResponse.error(
            "Unable to fetch PPT",
            500,
            err
        );

    }

}

// ===================== PUT =====================
// Update PPT

// Update PPT

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
            modifiedBy,
        } = body;

        if (
            title !== undefined &&
            !title.trim()
        ) {
            return ApiResponse.error(
                "PPT title is required",
                400
            );
        }

        const existing =
            await prisma.chapterContent.findUnique({

                where: {
                    id,
                },

                include: {
                    ppt: true,
                },

            });

        if (!existing) {
            return ApiResponse.error(
                "PPT content not found",
                404
            );
        }

        if (existing.type !== "PPT") {
            return ApiResponse.error(
                "Content type mismatch",
                400
            );
        }

        const oldFilePath = existing.ppt?.filePath;

        const result = await prisma.$transaction(async (tx) => {

            // ==========================
            // Handle display order change
            // ==========================

            if (
                displayOrder !== undefined &&
                displayOrder !== existing.displayOrder
            ) {

                await tx.chapterContent.count({
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

            const content =
                await tx.chapterContent.update({

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
            // Update PPT
            // ==========================

            const ppt =
                await tx.chapterPpt.update({

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
                ppt,
            };

        });

        // ==========================
        // Delete old PPT if replaced
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

                if (err.code !== "ENOENT") {

                    console.error(
                        "Unable to delete old PPT:",
                        err
                    );

                }

            }

        }

        return ApiResponse.success(
            result,
            "PPT updated successfully"
        );

    }
    catch (err) {

        console.error(
            "Update PPT Error:",
            err
        );

        return ApiResponse.error(
            "Unable to update PPT",
            500,
            err
        );

    }

}






// ===================== DELETE =====================
// Delete PPT

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

        const content = await prisma.chapterContent.findUnique({

            where: {
                id
            },

            include: {
                ppt: true
            }

        });

        if (!content) {

            return ApiResponse.error(
                "PPT content not found",
                404
            );

        }

        if (content.type !== "PPT") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }

        // ==========================
        // Delete physical PPT file
        // ==========================

        if (content.ppt?.filePath) {

            const filePath = path.join(
                process.cwd(),
                "public",
                content.ppt.filePath.replace(/^\/+/, "")
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

            "PPT deleted successfully"

        );

    }
    catch (err) {

        console.error(
            "Delete PPT Error:",
            err
        );

        return ApiResponse.error(

            "Unable to delete PPT",

            500,

            err

        );

    }

}