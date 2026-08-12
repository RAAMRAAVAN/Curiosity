import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';

// ===================== UPDATE CHAPTER =====================

export async function PATCH(request, { params }) {
    const auth = await requireAdminPermission(request, 'class_content.edit');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
    }

    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chapter ID is required.",
                },
                { status: 400 }
            );
        }

        const body = await request.json();

        const {
            chapterName,
            chapterNumber,
        } = body;

        // Validation
        if (
            !chapterName ||
            chapterNumber === undefined ||
            chapterNumber === null
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chapter Name and Chapter Number are required.",
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

        // Check chapter exists
        const existingChapter = await prisma.chapter.findUnique({
            where: {
                id,
            },
        });

        if (!existingChapter) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Chapter not found.",
                },
                { status: 404 }
            );
        }

        // Duplicate chapter name check within same subject
        const duplicateChapter = await prisma.chapter.findFirst({
            where: {
                subjectId: existingChapter.subjectId,
                chapterName: chapterName.trim(),
                NOT: {
                    id,
                },
            },
        });

        if (duplicateChapter) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Another chapter with the same name already exists.",
                },
                { status: 409 }
            );
        }

        // Update chapter
        const updatedChapter = await prisma.chapter.update({
            where: {
                id,
            },
            data: {
                chapterName: chapterName.trim(),
                displayOrder: Number(chapterNumber),
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Chapter updated successfully.",
                data: updatedChapter,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Update Chapter Error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong while updating chapter.",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined,
            },
            { status: 500 }
        );
    }
}