import { ApiResponse } from "@/utils/apiResponse";
import { prisma } from "@/server/prisma";
import { getUserFromRequest } from '@/server/auth';
import { requireAdminPermission } from '@/lib/adminRbac';


// ===================== GET SUBJECT BY ID =====================

export async function GET(
  req,
  { params }
) {

  try {
    const authUser = getUserFromRequest(req);
    const role = String(authUser?.role || '').toUpperCase();
    if (authUser && ['ADMIN', 'MANAGEMENT', 'TEACHER'].includes(role)) {
      const auth = await requireAdminPermission(req, 'subjects.view');
      if (!auth.ok) {
        return ApiResponse.error(auth.message, auth.status);
      }
    }

    const { id } = await params;


    if (!id) {
      return ApiResponse.error(
        "Subject ID is required",
        400
      );
    }

    const teacher = role === 'TEACHER'
      ? await prisma.teacher.findUnique({
          where: { userId: authUser?.userId || authUser?.id || '' },
          select: { id: true },
        })
      : null;


    const subject =
      await prisma.subject.findFirst({

        where: {
          id,
          ...(role === 'TEACHER'
            ? {
                teacherSubjects: {
                  some: {
                    teacherId: teacher?.id || '__unassigned_teacher__',
                    status: true,
                  },
                },
              }
            : {}),
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

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'subjects.edit');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
    }

    const body = await req.json();
    const updateData = {};
    if (body.subjectName !== undefined) {
      const subjectName = String(body.subjectName || '').trim();
      if (!subjectName) {
        return ApiResponse.error('Subject name is required', 400);
      }
      updateData.subjectName = subjectName;
    }
    if (body.icon !== undefined) {
      updateData.icon = body.icon || null;
    }
    if (body.status !== undefined) {
      updateData.status = Boolean(body.status);
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: updateData,
    });

    return ApiResponse.success(subject, 'Subject updated successfully');
  } catch (err) {
    console.error('Update Subject Error:', err);
    return ApiResponse.error('Unable to update subject', 500, err);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'subjects.delete');
  if (!auth.ok) {
    return ApiResponse.error(auth.message, auth.status);
  }

  try {
    const { id } = await params;
    if (!id) {
      return ApiResponse.error('Subject ID is required', 400);
    }

    await prisma.subject.delete({ where: { id } });
    return ApiResponse.success(null, 'Subject deleted successfully');
  } catch (err) {
    console.error('Delete Subject Error:', err);
    return ApiResponse.error('Unable to delete subject', 500, err);
  }
}