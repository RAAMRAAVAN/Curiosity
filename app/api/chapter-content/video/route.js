import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

// ===================== POST =====================
// Create Chapter Video

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
            videoType,
            videoLink,
            videoPath,
            thumbnail,
            duration,
            createdBy,

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
                "Video title is required",
                400
            );

        }

        if (!videoType) {

            return ApiResponse.error(
                "Video type is required",
                400
            );

        }

        // Validate video source

        if (
            videoType === "YOUTUBE" &&
            !videoLink
        ) {

            return ApiResponse.error(
                "YouTube link is required",
                400
            );

        }

        if (
            videoType === "ON_SITE" &&
            !videoPath
        ) {

            return ApiResponse.error(
                "Video path is required",
                400
            );

        }

        // Check Chapter

        const chapter = await prisma.chapter.findUnique({

            where: {
                id: chapterId,
            },

            select: {
                id: true,
            },

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

                    type: "VIDEO",

                    title: title.trim(),

                    displayOrder: nextDisplayOrder,

                    createdBy: createdBy || "admin",

                },

            });

            // Create Video

            const video = await tx.chapterVideo.create({

                data: {

                    contentId: content.id,

                    videoType,

                    videoLink: videoLink || null,

                    videoPath: videoPath || null,

                    thumbnail: thumbnail || null,

                    duration: duration || null,

                },

            });

            return {

                ...content,

                video,

            };

        });

        return ApiResponse.success(

            result,

            "Chapter video created successfully"

        );

    }
    catch (err) {

        console.error(
            "Create Video Error:",
            err
        );

        return ApiResponse.error(

            "Unable to create chapter video",

            500,

            err

        );

    }

}