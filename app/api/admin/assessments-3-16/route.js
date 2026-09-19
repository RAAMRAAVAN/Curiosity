import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { ApiResponse } from '@/utils/apiResponse';

const getAccessibleCenterIds = (actor) => new Set(
  (Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
    .map((id) => String(id).trim())
    .filter(Boolean)
);

const canAccessCenter = (actor, centerId, accessibleCenterIds) => {
  if (!centerId || actor?.isAdmin) return true;
  return accessibleCenterIds.has(String(centerId)) || actor?.canAccessCenter?.(String(centerId));
};

const normalizeIds = (value) => Array.from(new Set(
  (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
));

const normalizeChecklist = (value) => (Array.isArray(value) ? value : [])
  .map((item) => {
    if (typeof item === 'string') return { itemText: item.trim(), options: [] };
    return {
      itemText: String(item?.itemText || item?.label || '').trim(),
      options: (Array.isArray(item?.options) ? item.options : [])
        .map((option) => String(option || '').trim())
        .filter(Boolean),
    };
  })
  .filter((item) => item.itemText)
  .slice(0, 1)
  .map((item) => ({ ...item, itemText: 'Field 1' }));

const validateMappings = async (actor, classIds, subjectIds, accessibleCenterIds) => {
  if (!classIds.length) return { error: 'Select at least one class.' };
  if (!subjectIds.length) return { error: 'Select at least one subject.' };

  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({ where: { id: { in: classIds }, status: true }, select: { id: true, centerId: true } }),
    prisma.subject.findMany({ where: { id: { in: subjectIds }, status: true }, select: { id: true, classId: true, centerId: true } }),
  ]);

  if (classes.length !== classIds.length) return { error: 'One or more selected classes are unavailable.' };
  if (subjects.length !== subjectIds.length) return { error: 'One or more selected subjects are unavailable.' };

  const inaccessible = [...classes, ...subjects].some((item) => !canAccessCenter(actor, item.centerId, accessibleCenterIds));
  if (inaccessible) return { error: 'You are not authorized to use one or more selected records.' };

  const classIdSet = new Set(classIds);
  if (subjects.some((subject) => !classIdSet.has(String(subject.classId)))) {
    return { error: 'Each selected subject must belong to one of the selected classes.' };
  }

  return { classes, subjects };
};

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'assessments316.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    if (!prisma.assessment316) {
      return ApiResponse.error('Assessment (3-16 years) database model is unavailable. Run Prisma generate and apply migrations.', 500);
    }

    const accessibleCenterIds = getAccessibleCenterIds(auth.actor);
    const records = await prisma.assessment316.findMany({
      where: { status: true },
      include: {
        allowedClasses: { include: { class: { select: { id: true, className: true } } } },
        subjects: { include: { subject: { select: { id: true, subjectName: true, classId: true } } } },
        checklist: { where: { status: true }, orderBy: { displayOrder: 'asc' }, include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const visibleRecords = auth.actor.isAdmin
      ? records
      : records.filter((record) => canAccessCenter(auth.actor, record.centerId, accessibleCenterIds));

    return ApiResponse.success(visibleRecords);
  } catch (error) {
    console.error('Load 3-16 assessments error:', error);
    return ApiResponse.error('Unable to load Assessment (3-16 years) records.', 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'assessments316.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    if (!prisma.assessment316) {
      return ApiResponse.error('Assessment (3-16 years) database model is unavailable. Run Prisma generate and apply migrations.', 500);
    }

    const body = await req.json();
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim() || null;
    const requestedCenterId = body?.centerId == null ? null : String(body.centerId).trim() || null;
    const classIds = normalizeIds(body?.classIds);
    const subjectIds = normalizeIds(body?.subjectIds);
    const checklist = normalizeChecklist(body?.checklist);
    const accessibleCenterIds = getAccessibleCenterIds(auth.actor);

    if (!title) return ApiResponse.error('Assessment title is required.', 400);
    if (!auth.actor.isAdmin && !requestedCenterId && accessibleCenterIds.size === 0) {
      return ApiResponse.error('A center is required for this account.', 400);
    }
    if (!canAccessCenter(auth.actor, requestedCenterId, accessibleCenterIds)) {
      return ApiResponse.error('You are not authorized to use this center.', 403);
    }

    const mappings = await validateMappings(auth.actor, classIds, subjectIds, accessibleCenterIds);
    if (mappings.error) return ApiResponse.error(mappings.error, 400);
    if (!checklist.length || checklist.some((item) => item.options.length === 0)) {
      return ApiResponse.error('Each evaluation field must have at least one option.', 400);
    }

    const centerId = requestedCenterId || (auth.actor.isAdmin ? null : Array.from(accessibleCenterIds)[0]);
    const created = await prisma.assessment316.create({
      data: {
        title,
        description,
        centerId,
        allowedClasses: { create: classIds.map((classId) => ({ classId })) },
        subjects: { create: subjectIds.map((subjectId) => ({ subjectId })) },
        checklist: {
          create: checklist.map((item, index) => ({
            itemText: item.itemText,
            displayOrder: index + 1,
            options: { create: item.options.map((optionText, optionIndex) => ({ optionText, displayOrder: optionIndex + 1 })) },
          })),
        },
      },
      include: {
        allowedClasses: { include: { class: { select: { id: true, className: true } } } },
        subjects: { include: { subject: { select: { id: true, subjectName: true, classId: true } } } },
        checklist: { where: { status: true }, orderBy: { displayOrder: 'asc' }, include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } } },
      },
    });

    return ApiResponse.success(created, 'Assessment (3-16 years) created.', 201);
  } catch (error) {
    console.error('Create 3-16 assessment error:', error);
    return ApiResponse.error('Unable to create Assessment (3-16 years).', 500, error);
  }
}
