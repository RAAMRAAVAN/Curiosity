import { prisma } from '@/server/prisma';
import { getUserFromRequest } from '@/server/auth';
import { ApiResponse } from '@/utils/apiResponse';

export async function GET(req) {
  const user = getUserFromRequest(req);
  const userId = user?.userId || user?.id;
  if (!userId) return ApiResponse.error('Please sign in to view assessments.', 401);

  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, student: { select: { studyingClass: true, status: true } } },
    });
    const privileged = ['ADMIN', 'MANAGEMENT'].includes(String(user?.role || '').toUpperCase());
    let classId = null;
    if (!privileged) {
      if (!profile || String(profile.role).toUpperCase() !== 'STUDENT' || profile.student?.status === false) {
        return ApiResponse.error('Only students can view these assessments.', 403);
      }
      const classValue = String(profile.student?.studyingClass || '').trim();
      const studentClass = await prisma.class.findFirst({ where: { OR: [{ id: classValue }, { className: classValue }] }, select: { id: true } });
      if (!studentClass) return ApiResponse.success([]);
      classId = studentClass.id;
    }

    const assessments = await prisma.assessment316.findMany({
      where: {
        status: true,
        ...(classId ? { allowedClasses: { some: { classId } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        subjects: { include: { subject: { select: { id: true, subjectName: true } } } },
        checklist: { where: { status: true }, select: { id: true } },
        responses: userId ? { where: { userId }, select: { id: true, submittedAt: true } } : false,
      },
    });

    return ApiResponse.success(assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      subjects: assessment.subjects.map((item) => item.subject),
      fieldCount: assessment.checklist.length,
      response: assessment.responses?.[0] || null,
    })));
  } catch (error) {
    console.error('List 3-16 student assessments error:', error);
    return ApiResponse.error('Unable to load assessments.', 500, error);
  }
}
