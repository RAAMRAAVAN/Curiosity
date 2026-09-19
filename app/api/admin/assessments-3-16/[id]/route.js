import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { ApiResponse } from '@/utils/apiResponse';

const getAccessibleCenterIds = (actor) => new Set(
  (Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
    .map((id) => String(id).trim())
    .filter(Boolean)
);

const canAccessRecord = (actor, record, accessibleCenterIds) => {
  if (actor?.isAdmin || !record?.centerId) return true;
  return accessibleCenterIds.has(String(record.centerId)) || actor?.canAccessCenter?.(String(record.centerId));
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

const loadRecord = async (id) => prisma.assessment316.findUnique({
  where: { id },
  include: {
    allowedClasses: { include: { class: { select: { id: true, className: true } } } },
    subjects: { include: { subject: { select: { id: true, subjectName: true, classId: true } } } },
    checklist: { where: { status: true }, orderBy: { displayOrder: 'asc' }, include: { options: { where: { status: true }, orderBy: { displayOrder: 'asc' } } } },
  },
});

const validateMappings = async (actor, classIds, subjectIds) => {
  if (!classIds.length) return 'Select at least one class.';
  if (!subjectIds.length) return 'Select at least one subject.';

  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({ where: { id: { in: classIds }, status: true }, select: { id: true, centerId: true } }),
    prisma.subject.findMany({ where: { id: { in: subjectIds }, status: true }, select: { id: true, classId: true, centerId: true } }),
  ]);
  if (classes.length !== classIds.length) return 'One or more selected classes are unavailable.';
  if (subjects.length !== subjectIds.length) return 'One or more selected subjects are unavailable.';

  const accessibleCenterIds = new Set(
    (Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
      .map((id) => String(id).trim())
      .filter(Boolean)
  );
  const canAccessCenter = (centerId) => actor?.isAdmin
    || !centerId
    || accessibleCenterIds.has(String(centerId))
    || actor?.canAccessCenter?.(String(centerId));
  if ([...classes, ...subjects].some((item) => !canAccessCenter(item.centerId))) {
    return 'You are not authorized to use one or more selected records.';
  }

  const classIdSet = new Set(classIds);
  if (subjects.some((subject) => !classIdSet.has(String(subject.classId)))) {
    return 'Each selected subject must belong to one of the selected classes.';
  }

  return null;
};

export async function GET(req, { params }) {
  const auth = await requireAdminPermission(req, 'assessments316.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const record = await loadRecord(id);
    if (!record || !record.status) return ApiResponse.error('Assessment not found.', 404);

    const accessibleCenterIds = getAccessibleCenterIds(auth.actor);
    if (!canAccessRecord(auth.actor, record, accessibleCenterIds)) {
      return ApiResponse.error('You are not authorized to access this assessment.', 403);
    }

    return ApiResponse.success(record);
  } catch (error) {
    console.error('Load 3-16 assessment error:', error);
    return ApiResponse.error('Unable to load Assessment (3-16 years).', 500, error);
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'assessments316.edit');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const record = await loadRecord(id);
    if (!record || !record.status) return ApiResponse.error('Assessment not found.', 404);

    const accessibleCenterIds = getAccessibleCenterIds(auth.actor);
    if (!canAccessRecord(auth.actor, record, accessibleCenterIds)) {
      return ApiResponse.error('You are not authorized to edit this assessment.', 403);
    }

    const body = await req.json();
    const title = String(body?.title ?? record.title).trim();
    const description = body?.description === undefined
      ? record.description
      : String(body.description || '').trim() || null;
    if (!title) return ApiResponse.error('Assessment title is required.', 400);

    const classIds = body?.classIds === undefined
      ? record.allowedClasses.map((item) => item.classId)
      : normalizeIds(body.classIds);
    const subjectIds = body?.subjectIds === undefined
      ? record.subjects.map((item) => item.subjectId)
      : normalizeIds(body.subjectIds);
    const checklist = body?.checklist === undefined
      ? record.checklist.slice(0, 1).map((item) => ({ itemText: 'Field 1', options: item.options.map((option) => option.optionText) }))
      : normalizeChecklist(body.checklist);
    const mappingError = await validateMappings(auth.actor, classIds, subjectIds);
    if (mappingError) return ApiResponse.error(mappingError, 400);
    if (!checklist.length || checklist.some((item) => item.options.length === 0)) {
      return ApiResponse.error('Each evaluation field must have at least one option.', 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.assessment316Class.deleteMany({ where: { assessmentId: id } });
      await tx.assessment316Subject.deleteMany({ where: { assessmentId: id } });
      await tx.assessment316ChecklistItem.deleteMany({ where: { assessmentId: id } });
      return tx.assessment316.update({
        where: { id },
        data: {
          title,
          description,
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
    });

    return ApiResponse.success(updated, 'Assessment (3-16 years) updated.');
  } catch (error) {
    console.error('Update 3-16 assessment error:', error);
    return ApiResponse.error('Unable to update Assessment (3-16 years).', 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'assessments316.delete');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const record = await loadRecord(id);
    if (!record || !record.status) return ApiResponse.error('Assessment not found.', 404);

    const accessibleCenterIds = getAccessibleCenterIds(auth.actor);
    if (!canAccessRecord(auth.actor, record, accessibleCenterIds)) {
      return ApiResponse.error('You are not authorized to delete this assessment.', 403);
    }

    const deleted = await prisma.assessment316.update({
      where: { id },
      data: { status: false },
    });

    return ApiResponse.success(deleted, 'Assessment (3-16 years) deleted.');
  } catch (error) {
    console.error('Delete 3-16 assessment error:', error);
    return ApiResponse.error('Unable to delete Assessment (3-16 years).', 500, error);
  }
}
