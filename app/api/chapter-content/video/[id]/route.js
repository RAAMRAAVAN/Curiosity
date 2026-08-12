import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

import fs from "fs/promises";
import path from "path";

// ===================== GET =====================
// Fetch single video

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

                    video: true

                }

            });



        if (!content) {

            return ApiResponse.error(
                "Video content not found",
                404
            );

        }



        if (content.type !== "VIDEO") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }



        return ApiResponse.success(
            content,
            "Video fetched successfully"
        );


    }
    catch (err) {

        console.error(
            "Fetch Video Error:",
            err
        );


        return ApiResponse.error(
            "Unable to fetch video",
            500,
            err
        );

    }

}





// ===================== PUT =====================
// Update video

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
            videoType,
            videoLink,
            videoPath,
            thumbnail,
            duration,
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

                    video: true

                }

            });



        if (!existing) {

            return ApiResponse.error(
                "Video content not found",
                404
            );

        }



        if (existing.type !== "VIDEO") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }




        let oldVideoToDelete = null;


        const result = await prisma.$transaction(async (tx) => {


            // Update chapter content
            const content = await tx.chapterContent.update({

                where: {
                    id,
                },

                data: {

                    ...(title && {
                        title: title.trim(),
                    }),

                    ...(displayOrder !== undefined && {
                        displayOrder,
                    }),

                    ...(status !== undefined && {
                        status,
                    }),

                    ...(modifiedBy && {
                        modifiedBy,
                    }),

                },

            });



            /*
                ON_SITE -> YOUTUBE
                Delete old uploaded file
            */
            if (
                existing.video.videoType === "ON_SITE" &&
                videoType === "YOUTUBE" &&
                existing.video.videoPath
            ) {

                oldVideoToDelete = existing.video.videoPath;

            }



            /*
                ON_SITE -> ON_SITE
                Replace old uploaded video
            */
            if (
                existing.video?.videoType === "ON_SITE" &&
                videoType === "YOUTUBE" &&
                existing.video?.videoPath
            ) {

                console.log("OLD VIDEO TYPE:", existing.video.videoType);

                console.log(
                    "OLD VIDEO PATH:",
                    existing.video.videoPath
                );

                console.log(
                    "NEW VIDEO TYPE:",
                    videoType
                );


                oldVideoToDelete = existing.video.videoPath;

            }



            const video = await tx.chapterVideo.update({

                where: {
                    contentId: id,
                },


                data: {

                    ...(videoType && {
                        videoType,
                    }),


                    // YouTube
                    ...(videoType === "YOUTUBE" && {

                        videoLink,

                        videoPath: null,

                    }),



                    // Uploaded video
                    ...(videoType === "ON_SITE" && {

                        videoPath,

                        videoLink: null,

                    }),



                    ...(thumbnail !== undefined && {

                        thumbnail,

                    }),



                    ...(duration !== undefined && {

                        duration,

                    }),

                },

            });



            return {
                ...content,
                video,
            };

        });



        // Delete physical file after DB update
        // Delete old physical video file after DB update

        if (oldVideoToDelete) {

            try {

                const filePath = path.join(
                    process.cwd(),
                    "public",
                    oldVideoToDelete.replace(/^\/+/, "")
                );


                console.log(
                    "Deleting old video:",
                    filePath
                );


                await fs.unlink(filePath);


                console.log(
                    "Old video deleted successfully"
                );


            } catch (error) {

                console.error(
                    "Video delete failed:",
                    error.message
                );

            }

        }





        return ApiResponse.success(

            result,

            "Video updated successfully"

        );



    }
    catch (err) {


        console.error(
            "Update Video Error:",
            err
        );


        return ApiResponse.error(

            "Unable to update video",

            500,

            err

        );


    }

}






// Delete
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
                video: true
            }

        });

        if (!content) {

            return ApiResponse.error(
                "Video content not found",
                404
            );

        }

        if (content.type !== "VIDEO") {

            return ApiResponse.error(
                "Content type mismatch",
                400
            );

        }

        // Delete physical file if it exists
        if (content.video?.videoPath) {

            try {

                const filePath = path.join(
                    process.cwd(),
                    "public",
                    content.video.videoPath.replace(/^\/+/, "")
                );

                await fs.unlink(filePath);

            }
            catch (err) {

                // Ignore if file doesn't exist
                console.warn(
                    "Video file not found:",
                    err.message
                );

            }

        }

        // Delete database record
        await prisma.chapterContent.delete({

            where: {
                id
            }

        });

        return ApiResponse.success(

            null,

            "Video deleted successfully"

        );

    }
    catch (err) {

        console.error(
            "Delete Video Error:",
            err
        );

        return ApiResponse.error(

            "Unable to delete video",

            500,

            err

        );

    }

}