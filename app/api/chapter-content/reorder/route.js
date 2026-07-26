import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";


// ===================== PUT =====================
// Reorder Chapter Contents: /api/chapter-content/reorder

export async function PUT(req) {


    try {


        const body = await req.json();



        const {

            chapterId,
            contentId,
            newOrder

        } = body;




        // Validation

        if(!chapterId){

            return ApiResponse.error(
                "Chapter ID is required",
                400
            );

        }



        if(!contentId){

            return ApiResponse.error(
                "Content ID is required",
                400
            );

        }



        if(!newOrder || newOrder < 1){

            return ApiResponse.error(
                "Valid new order is required",
                400
            );

        }







        // Check content exists

        const movingContent =
            await prisma.chapterContent.findUnique({

                where:{
                    id:contentId
                }

            });




        if(!movingContent){

            return ApiResponse.error(
                "Content not found",
                404
            );

        }






        if(movingContent.chapterId !== chapterId){


            return ApiResponse.error(
                "Content does not belong to this chapter",
                400
            );


        }






        const oldOrder =
            movingContent.displayOrder;






        // Count contents

        const totalContents =
            await prisma.chapterContent.count({

                where:{
                    chapterId
                }

            });





        if(newOrder > totalContents){


            return ApiResponse.error(
                "Invalid position",
                400
            );


        }






        await prisma.$transaction(async(tx)=>{



            // Moving UP

            if(newOrder < oldOrder){


                await tx.chapterContent.updateMany({

                    where:{


                        chapterId,


                        displayOrder:{
                            gte:newOrder,
                            lt:oldOrder
                        }


                    },


                    data:{


                        displayOrder:{
                            increment:1
                        }


                    }


                });


            }







            // Moving DOWN

            else if(newOrder > oldOrder){



                await tx.chapterContent.updateMany({

                    where:{


                        chapterId,


                        displayOrder:{
                            gt:oldOrder,
                            lte:newOrder
                        }


                    },


                    data:{


                        displayOrder:{
                            decrement:1
                        }


                    }


                });



            }






            // Update moving item

            await tx.chapterContent.update({

                where:{
                    id:contentId
                },


                data:{


                    displayOrder:newOrder


                }


            });



        });







        const updatedContents =
            await prisma.chapterContent.findMany({

                where:{
                    chapterId
                },


                include:{

                    note:true,
                    video:true,
                    pdf:true,
                    ppt:true,
                    previousPaper:true

                },


                orderBy:{

                    displayOrder:"asc"

                }


            });






        return ApiResponse.success(

            updatedContents,

            "Content order updated successfully"

        );




    }
    catch(err){


        console.error(
            "Reorder Content Error:",
            err
        );


        return ApiResponse.error(

            "Unable to reorder contents",

            500,

            err

        );


    }

}