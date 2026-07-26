import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";

// ===================== GET =====================
// Fetch all chapter contents

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const chapterId = searchParams.get("chapterId");

        if (!chapterId) {
            return ApiResponse.error(
                "Chapter ID is required",
                400
            );
        }

        // Check Chapter Exists
        const chapter = await prisma.chapter.findUnique({
            where: {
                id: chapterId,
            },
        });

        if (!chapter) {
            return ApiResponse.error(
                "Chapter not found",
                404
            );
        }

        // Fetch contents and counts together
        const [contents, groupedCounts] = await Promise.all([
            prisma.chapterContent.findMany({
                where: {
                    chapterId,
                    status: true,
                },
                include: {
                    note: true,
                    video: true,
                    pdf: true,
                    ppt: true,
                    previousPaper: true,
                },
                orderBy: {
                    displayOrder: "asc",
                },
            }),

            prisma.chapterContent.groupBy({
                by: ["type"],
                where: {
                    chapterId,
                    status: true,
                },
                _count: {
                    type: true,
                },
            }),
        ]);

        // Separate contents
        const notes = [];
        const videos = [];
        const pdfs = [];
        const ppts = [];
        const previousPapers = [];

        contents.forEach((content) => {
            switch (content.type) {
                case "NOTE":
                    notes.push(content);
                    break;

                case "VIDEO":
                    videos.push(content);
                    break;

                case "PDF":
                    pdfs.push(content);
                    break;

                case "PPT":
                    ppts.push(content);
                    break;

                case "PREVIOUS_PAPER":
                    previousPapers.push(content);
                    break;
            }
        });

        // Default counts
        const content_count = {
            notes: 0,
            videos: 0,
            pdfs: 0,
            ppts: 0,
            previousPapers: 0,
            total: 0,
        };

        // Populate counts from DB result
        groupedCounts.forEach((item) => {
            switch (item.type) {
                case "NOTE":
                    content_count.notes = item._count.type;
                    break;

                case "VIDEO":
                    content_count.videos = item._count.type;
                    break;

                case "PDF":
                    content_count.pdfs = item._count.type;
                    break;

                case "PPT":
                    content_count.ppts = item._count.type;
                    break;

                case "PREVIOUS_PAPER":
                    content_count.previousPapers = item._count.type;
                    break;
            }

            content_count.total += item._count.type;
        });

        return ApiResponse.success(
            {
                chapter,
                notes,
                videos,
                pdfs,
                ppts,
                previousPapers,
                content_count,
            },
            "Chapter contents loaded successfully"
        );
    } catch (err) {
        console.error("Chapter Content Fetch Error:", err);

        return ApiResponse.error(
            "Unable to fetch chapter contents",
            500,
            err
        );
    }
}