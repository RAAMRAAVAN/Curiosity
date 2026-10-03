import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';

export async function PATCH(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_items.edit');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const body = await req.json();
    const current = await prisma.itemMaster.findUnique({ where: { id } });
    if (!current) return ApiResponse.error('Item master not found.', 404);

    const name = body?.name === undefined ? current.name : String(body.name || '').trim();
    const categoryId = body?.categoryId === undefined ? current.categoryId : String(body.categoryId || '').trim();
    if (!name || !categoryId) return ApiResponse.error('Item name and category are required.', 400);

    const category = await prisma.itemCategory.findFirst({ where: { id: categoryId, status: true }, select: { id: true } });
    if (!category) return ApiResponse.error('Select an active item category.', 400);

    const item = await prisma.itemMaster.update({
      where: { id },
      data: {
        name,
        categoryId,
        ...(body?.description !== undefined ? { description: String(body.description || '').trim() || null } : {}),
        ...(body?.unit !== undefined ? { unit: String(body.unit || 'unit').trim() || 'unit' } : {}),
        ...(body?.manufacturer !== undefined ? { manufacturer: String(body.manufacturer || '').trim() || null } : {}),
        ...(body?.modelNumber !== undefined ? { modelNumber: String(body.modelNumber || '').trim() || null } : {}),
        ...(body?.status !== undefined ? { status: Boolean(body.status) } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return ApiResponse.success(item, 'Item master updated.');
  } catch (error) {
    if (error?.code === 'P2002') return ApiResponse.error('An item with this name already exists in the selected category.', 409);
    console.error('Update item master error:', error);
    return ApiResponse.error('Unable to update item master.', 500, error);
  }
}

export async function DELETE(req, { params }) {
  const auth = await requireAdminPermission(req, 'asset_items.delete');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const { id } = await params;
    const item = await prisma.itemMaster.findUnique({ where: { id }, select: { id: true } });
    if (!item) return ApiResponse.error('Item master not found.', 404);

    const activeAssets = await prisma.assetList.count({ where: { itemMasterId: id, status: true } });
    if (activeAssets) return ApiResponse.error('Remove or deactivate this item’s assets before deleting it.', 409);

    await prisma.itemMaster.update({ where: { id }, data: { status: false } });
    return ApiResponse.success({ id }, 'Item master deactivated.');
  } catch (error) {
    console.error('Delete item master error:', error);
    return ApiResponse.error('Unable to delete item master.', 500, error);
  }
}