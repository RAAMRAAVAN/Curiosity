import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'projects.edit');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const body = await req.json();
    const current = await prisma.project.findUnique({ where: { id } });
    if (!current) return ApiResponse.error('Project not found.', 404);

    const name = body?.name === undefined ? current.name : String(body.name || '').trim();
    const suffix = body?.suffix === undefined ? current.suffix : String(body.suffix || '').trim();
    if (!name || !suffix) return ApiResponse.error('Project name and suffix are required.', 400);

    const project = await prisma.project.update({
      where: { id },
      data: { name, suffix, ...(body?.status === true ? { status: true } : {}) },
    });
    return ApiResponse.success(project, 'Project updated.');
  } catch (error) {
    if (error?.code === 'P2002') {
      const field = String(error?.meta?.target || '');
      return ApiResponse.error(field.includes('suffix') ? 'This project suffix is already in use.' : 'A project with this name already exists.', 409);
    }
    console.error('Update project error:', error);
    return ApiResponse.error('Unable to update project.', 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'projects.delete');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!project) return { type: 'missing' };
      if (!project.status) return { type: 'inactive' };

      const assetCount = await tx.assetList.count({ where: { projectId: id, status: true } });
      if (assetCount > 0) return { type: 'assigned', assetCount };

      await tx.project.update({ where: { id }, data: { status: false } });
      return { type: 'deactivated' };
    }, { isolationLevel: 'Serializable' });

    if (result.type === 'missing') return ApiResponse.error('Project not found.', 404);
    if (result.type === 'assigned') {
      return ApiResponse.error(`This project cannot be deactivated because ${result.assetCount} asset(s) are assigned to it. Reassign or remove those assets first.`, 409);
    }
    return ApiResponse.success({ id }, result.type === 'inactive' ? 'Project is already deactivated.' : 'Project deactivated.');
  } catch (error) {
    if (error?.code === 'P2034') {
      return ApiResponse.error('Project assignments changed while deactivating. Refresh and try again.', 409);
    }
    console.error('Delete project error:', error);
    return ApiResponse.error('Unable to deactivate project.', 500, error);
  }
}
