import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";


// ===================== GET SUBJECT BY ID =====================

export async function GET(
  req,
  { params }
) {

  try {

    const { id } = await params;


    if (!id) {
      return ApiResponse.error(
        "Subject ID is required",
        400
      );
    }


    const subject =
      await prisma.subject.findUnique({

        where: {
          id,
        },


        include: {

          class: {
            select: {
              id: true,
              className: true,
              icon: true,
            },
          },


          teacherSubjects: {

            include: {

              teacher: {

                select: {

                  id: true,

                  name: true,

                  phone: true,

                },

              },

            },

          },

        },

      });



    if (!subject) {

      return ApiResponse.error(
        "Subject not found",
        404
      );

    }



    return ApiResponse.success(
      subject,
      "Subject loaded successfully"
    );



  } catch (err) {


    console.error(
      "Fetch Subject Error:",
      err
    );


    return ApiResponse.error(
      "Unable to fetch subject",
      500,
      err
    );

  }

}