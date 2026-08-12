import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

// ===================== POST =====================
// Create Previous Paper

export async function POST(req) {

    const auth = await requireAdminPermission(req, 'class_content.edit');
    if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
    }

    try {

        const body = await req.json();

        const {

            chapterId,
            title,
            fileName,
            filePath,
            fileSize,
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
                "Previous paper title is required",
                400
            );

        }

        if (!filePath) {

            return ApiResponse.error(
                "Previous paper file path is required",
                400
            );

        }

        // Check Chapter Exists

        const chapter = await prisma.chapter.findUnique({

            where: {
                id: chapterId
            },

            select: {
                id: true
            }

        });

        if (!chapter) {

            return ApiResponse.error(
                "Chapter not found",
                404
            );

        }

        // Transaction

        const result = await prisma.$transaction(async (tx) => {

            // Get next display order

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

            // Create parent content

            const content = await tx.chapterContent.create({

                data: {

                    chapterId,

                    type: "PREVIOUS_PAPER",

                    title: title.trim(),

                    displayOrder: nextDisplayOrder,

                    createdBy: createdBy || "admin",

                }

            });

            // Create Previous Paper

            const previousPaper = await tx.chapterPreviousPaper.create({

                data: {

                    contentId: content.id,

                    fileName: fileName || null,

                    filePath,

                    fileSize: fileSize || null,

                }

            });

            return {

                ...content,

                previousPaper,

            };

        });

        return ApiResponse.success(

            result,

            "Previous paper created successfully"

        );

    }
    catch (err) {

        console.error(
            "Create Previous Paper Error:",
            err
        );

        return ApiResponse.error(

            "Unable to create previous paper",

            500,

            err

        );

    }

}