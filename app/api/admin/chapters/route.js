import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
    try {
        const body = await request.json();

        const {
            chapterName,
            chapterNumber,
            subjectId,
        } = body;

        // Validation
        if (!chapterName || !subjectId || chapterNumber === undefined || chapterNumber === null) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chapter Name, Chapter Number and Subject are required.",
                },
                { status: 400 }
            );
        }

        if (Number(chapterNumber) < 1) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chapter Number must be greater than 0.",
                },
                { status: 400 }
            );
        }

        // Check subject exists
        const subject = await prisma.subject.findUnique({
            where: {
                id: subjectId,
            },
        });

        if (!subject) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Subject not found.",
                },
                { status: 404 }
            );
        }

        // Duplicate chapter name check
        const existingChapter = await prisma.chapter.findFirst({
            where: {
                subjectId,
                chapterName: chapterName.trim(),
            },
        });

        if (existingChapter) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chapter already exists for this subject.",
                },
                { status: 409 }
            );
        }

        // Create Chapter
        const chapter = await prisma.chapter.create({
            data: {
                chapterName: chapterName.trim(),
                displayOrder: Number(chapterNumber),
                subjectId,
                status: true,
                // createdBy: userId, // Add after authentication
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Chapter created successfully.",
                data: chapter,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create Chapter Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while creating chapter.",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined,
            },
            { status: 500 }
        );
    }
}


// GET ALL CHAPTERS OF A SUBJECT
// GET ALL CHAPTERS OF A SUBJECT
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const subjectId = searchParams.get("subjectId");

        if (!subjectId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Subject ID is required.",
                },
                { status: 400 }
            );
        }

        // Check Subject Exists
        const subject = await prisma.subject.findUnique({
            where: {
                id: subjectId,
            },
        });

        if (!subject) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Subject not found.",
                },
                { status: 404 }
            );
        }

        // Fetch chapters and grouped counts in parallel
        const [chapters, groupedCounts] = await Promise.all([
            prisma.chapter.findMany({
                where: {
                    subjectId,
                    status: true,
                },
                orderBy: {
                    displayOrder: "asc",
                },
                include: {
                    contents: {
                        where: {
                            status: true,
                        },
                        orderBy: {
                            displayOrder: "asc",
                        },
                        include: {
                            note: true,
                            video: true,
                            pdf: true,
                            ppt: true,
                            previousPaper: true,
                        },
                    },
                },
            }),

            prisma.chapterContent.groupBy({
                by: ["chapterId", "type"],
                where: {
                    status: true,
                    chapter: {
                        subjectId,
                        status: true,
                    },
                },
                _count: {
                    type: true,
                },
            }),
        ]);

        // Create a lookup map
        const countMap = {};

        groupedCounts.forEach((item) => {
            if (!countMap[item.chapterId]) {
                countMap[item.chapterId] = {
                    notes: 0,
                    videos: 0,
                    pdfs: 0,
                    ppts: 0,
                    previousPapers: 0,
                    total: 0,
                };
            }

            switch (item.type) {
                case "NOTE":
                    countMap[item.chapterId].notes = item._count.type;
                    break;

                case "VIDEO":
                    countMap[item.chapterId].videos = item._count.type;
                    break;

                case "PDF":
                    countMap[item.chapterId].pdfs = item._count.type;
                    break;

                case "PPT":
                    countMap[item.chapterId].ppts = item._count.type;
                    break;

                case "PREVIOUS_PAPER":
                    countMap[item.chapterId].previousPapers = item._count.type;
                    break;
            }

            countMap[item.chapterId].total += item._count.type;
        });

        // Attach counts to each chapter
        const data = chapters.map((chapter) => ({
            ...chapter,
            content_count:
                countMap[chapter.id] || {
                    notes: 0,
                    videos: 0,
                    pdfs: 0,
                    ppts: 0,
                    previousPapers: 0,
                    total: 0,
                },
        }));

        return NextResponse.json(
            {
                success: true,
                message: "Chapters loaded successfully.",
                data,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Fetch Chapters Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while fetching chapters.",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined,
            },
            { status: 500 }
        );
    }
}