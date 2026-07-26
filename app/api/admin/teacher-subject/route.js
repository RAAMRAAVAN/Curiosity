import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET(req) {

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
                name:true
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
        const assignedSubjects = await prisma.teacherSubject.findMany({

            where:{
                teacherId
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

        });





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



        const selectedSubjectIds = [
            ...new Set(subjectIds)
        ];



        // Validate subjects
        if(selectedSubjectIds.length > 0){

            const subjects = await prisma.subject.findMany({

                where:{
                    id:{
                        in:selectedSubjectIds
                    }
                },

                select:{
                    id:true
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

        }



        // Existing assignments
        const existingMappings = await prisma.teacherSubject.findMany({

            where:{
                teacherId
            },

            select:{
                subjectId:true
            }

        });



        const existingSubjectIds = existingMappings.map(
            item => item.subjectId
        );



        // New subjects
        const subjectsToAdd = selectedSubjectIds.filter(
            id => !existingSubjectIds.includes(id)
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