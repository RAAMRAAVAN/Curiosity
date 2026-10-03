import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminPermission } from '@/lib/adminRbac';



export async function GET(req) {
    const viewAuth = await requireAdminPermission(req, 'teachers.view');
    const auth = viewAuth.ok ? viewAuth : await requireAdminPermission(req, 'teachers.edit');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status || 403 });
    }

    try {


        const { searchParams } = new URL(req.url);


        const teacherId = searchParams.get("teacherId");



        // Validation
        if(!teacherId){

            return NextResponse.json(
                {
                    success:false,
                    message:"Teacher ID is required"
                },
                {
                    status:400
                }
            );

        }



        // Check teacher exists
        const teacher = await prisma.teacher.findUnique({

            where:{
                id:teacherId
            },

            select:{
                id:true,
                name:true,
                userId:true
            }

        });



        if(!teacher){

            return NextResponse.json(
                {
                    success:false,
                    message:"Teacher not found"
                },
                {
                    status:404
                }
            );

        }



        // Fetch assigned subjects
        const classAccesses = await prisma.userClassAccess.findMany({
            where: { userId: teacher.userId, status: true },
            select: { classId: true },
        });
        const classIds = classAccesses.map((access) => access.classId);
        const assignedSubjects = classIds.length ? await prisma.teacherSubject.findMany({

            where:{
                teacherId,
                status: true,
                subject: { classId: { in: classIds }, status: true },
            },


            select:{


                subject:{


                    select:{


                        id:true,

                        subjectName:true,

                        icon:true,


                        class:{


                            select:{


                                id:true,

                                className:true,

                                icon:true


                            }

                        }


                    }

                }

            },


            orderBy:{


                subject:{

                    subjectName:"asc"

                }

            }

        }) : [];





        // Flatten response
        const subjects = assignedSubjects.map(item=>({

            id:item.subject.id,

            subjectName:item.subject.subjectName,

            icon:item.subject.icon,

            classId:item.subject.class.id,

            className:item.subject.class.className,

            classIcon:item.subject.class.icon

        }));





        return NextResponse.json(
            {
                success:true,

                message:"Assigned subjects loaded successfully",

                data:{
                    teacherId:teacher.id,

                    teacherName:teacher.name,

                    classIds,

                    subjects
                }
            },
            {
                status:200
            }
        );



    }
    catch(error){


        console.error(
            "Teacher Subject Fetch Error:",
            error
        );


        return NextResponse.json(
            {
                success:false,
                message:"Unable to load assigned subjects",
                error:error.message
            },
            {
                status:500
            }
        );


    }

}


export async function POST(request) {
    const auth = await requireAdminPermission(request, 'teachers.edit');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status || 403 });
    }

    try {

        const body = await request.json();

        const {
            teacherId,
            subjectIds
        } = body;



        if (!teacherId || !Array.isArray(subjectIds)) {

            return NextResponse.json(
                {
                    success:false,
                    message:"Teacher ID and subjectIds array are required"
                },
                {
                    status:400
                }
            );

        }



        const teacher = await prisma.teacher.findUnique({

            where:{
                id:teacherId
            }

        });



        if(!teacher){

            return NextResponse.json(
                {
                    success:false,
                    message:"Teacher not found"
                },
                {
                    status:404
                }
            );

        }



        const selectedSubjectIds = Array.from(new Set(subjectIds.map((id) => String(id).trim()).filter(Boolean)));

        const classAccesses = await prisma.userClassAccess.findMany({
            where: { userId: teacher.userId, status: true },
            select: { classId: true },
        });
        const mappedClassIds = new Set(classAccesses.map((access) => access.classId));



        // Validate subjects
        if(selectedSubjectIds.length > 0){

            const subjects = await prisma.subject.findMany({

                where:{
                    id:{
                        in:selectedSubjectIds
                    },
                    status: true,
                },

                select:{
                    id:true,
                    classId:true,
                }

            });



            if(subjects.length !== selectedSubjectIds.length){

                return NextResponse.json(
                    {
                        success:false,
                        message:"One or more subjects are invalid"
                    },
                    {
                        status:404
                    }
                );

            }

            if (subjects.some((subject) => !mappedClassIds.has(subject.classId))) {
                return NextResponse.json(
                    { success: false, message: "Subjects can only be assigned from classes mapped to this teacher." },
                    { status: 403 }
                );
            }

        }



        // Existing assignments
        const existingMappings = await prisma.teacherSubject.findMany({

            where:{
                teacherId,
            },

            select:{
                subjectId:true,
                status:true,
            }

        });



        const existingSubjectIds = existingMappings.map((item) => item.subjectId);
        const existingSubjectIdSet = new Set(existingSubjectIds);
        const subjectsToReactivate = existingMappings
            .filter((item) => !item.status && selectedSubjectIds.includes(item.subjectId))
            .map((item) => item.subjectId);



        // New subjects
        const subjectsToAdd = selectedSubjectIds.filter(
            id => !existingSubjectIdSet.has(id)
        );



        // Removed subjects
        const subjectsToRemove = existingSubjectIds.filter(
            id => !selectedSubjectIds.includes(id)
        );



        await prisma.$transaction(async(tx)=>{


            // Remove unchecked subjects
            if(subjectsToRemove.length > 0){

                await tx.teacherSubject.deleteMany({

                    where:{
                        teacherId,

                        subjectId:{
                            in:subjectsToRemove
                        }
                    }

                });

            }

            if (subjectsToReactivate.length > 0) {
                await tx.teacherSubject.updateMany({
                    where: { teacherId, subjectId: { in: subjectsToReactivate } },
                    data: { status: true },
                });
            }



            // Add new subjects
            if(subjectsToAdd.length > 0){

                await tx.teacherSubject.createMany({

                    data:subjectsToAdd.map(subjectId=>({

                        teacherId,
                        subjectId

                    }))

                });

            }


        });



        return NextResponse.json(
            {
                success:true,
                message:"Teacher subjects updated successfully",

                data:{
                    added:subjectsToAdd,
                    removed:subjectsToRemove,
                    total:selectedSubjectIds.length
                }

            },
            {
                status:200
            }
        );



    }
    catch(error){

        console.error(
            "Teacher Subject Sync Error:",
            error
        );


        return NextResponse.json(
            {
                success:false,
                message:"Internal server error",
                error:error.message
            },
            {
                status:500
            }
        );

    }

}