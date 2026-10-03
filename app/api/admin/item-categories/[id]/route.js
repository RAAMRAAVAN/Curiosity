import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { normalizeCodePrefix } from '@/lib/assetManagement';

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_categories.edit');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const body = await req.json();
    const current = await prisma.itemCategory.findUnique({ where: { id } });
    if (!current) return ApiResponse.error('Item category not found.', 404);

    const name = body?.name === undefined ? current.name : String(body.name || '').trim();
    if (!name) return ApiResponse.error('Category name is required.', 400);

    const codePrefix = body?.codePrefix === undefined || String(body.codePrefix).trim() === '' ? current.codePrefix : normalizeCodePrefix(body.codePrefix);
    if (!codePrefix) return ApiResponse.error('Asset code prefix must be 2-6 letters or digits.', 400);

    const category = await prisma.itemCategory.update({
      where: { id },
      data: {
        name,
        codePrefix,
        ...(body?.description !== undefined ? { description: String(body.description || '').trim() || null } : {}),
        ...(body?.status !== undefined ? { status: Boolean(body.status) } : {}),
      },
    });
    return ApiResponse.success(category, 'Item category updated.');
  } catch (error) {
    if (error?.code === 'P2002') {
      return ApiResponse.error(String(error?.meta?.target || '').includes('code_prefix') ? 'This asset code prefix is already in use.' : 'A category with this name already exists.', 409);
    }
    console.error('Update item category error:', error);
    return ApiResponse.error('Unable to update item category.', 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_categories.delete');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const category = await prisma.itemCategory.findUnique({ where: { id }, select: { id: true } });
    if (!category) return ApiResponse.error('Item category not found.', 404);

    const activeItems = await prisma.itemMaster.count({ where: { categoryId: id, status: true } });
    if (activeItems) return ApiResponse.error('Move or deactivate this category’s items before deleting it.', 409);

    await prisma.itemCategory.update({ where: { id }, data: { status: false } });
    return ApiResponse.success({ id }, 'Item category deactivated.');
  } catch (error) {
    console.error('Delete item category error:', error);
    return ApiResponse.error('Unable to delete item category.', 500, error);
  }
}