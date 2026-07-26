import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET(){

    try{

        const classes = await prisma.class.findMany({

            where:{
                subjects:{
                    some:{}
                }
            },

            select:{
                id:true,
                className:true,
                icon:true,

                subjects:{
                    select:{
                        id:true,
                        subjectName:true,
                        icon:true
                    },

                    orderBy:{
                        subjectName:"asc"
                    }
                }
            },

            orderBy:{
                className:"asc"
            }

        });


        return NextResponse.json({

            success:true,
            data:classes

        });


    }
    catch(error){

        console.log(error);

        return NextResponse.json({

            success:false,
            message:"Unable to load classes"

        },{
            status:500
        });

    }

}