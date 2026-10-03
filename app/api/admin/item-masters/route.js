import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { buildPaginationMeta, containsFilter, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'asset_items.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const include = {
      category: { select: { id: true, name: true, status: true } },
      _count: { select: { assets: true } },
    };
    const orderBy = [{ status: 'desc' }, { name: 'asc' }];
    const pagination = parsePagination(req);
    if (pagination) {
      const categoryId = pagination.params.get('categoryId');
      const where = {
        ...(categoryId ? { categoryId } : {}),
        ...(pagination.search ? {
          OR: [
            { name: containsFilter(pagination.search) },
            { unit: containsFilter(pagination.search) },
            { manufacturer: containsFilter(pagination.search) },
            { modelNumber: containsFilter(pagination.search) },
            { category: { name: containsFilter(pagination.search) } },
          ],
        } : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.itemMaster.count({ where }),
        prisma.itemMaster.findMany({ where, include, orderBy, skip: pagination.skip, take: pagination.take }),
      ]);
      return ApiResponse.paginated(rows, buildPaginationMeta(total, pagination));
    }

    const items = await prisma.itemMaster.findMany({ include, orderBy });
    return ApiResponse.success(items);
  } catch (error) {
    console.error('Load item masters error:', error);
    return ApiResponse.error('Unable to load item masters.', 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'asset_items.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const categoryId = String(body?.categoryId || '').trim();
    if (!name || !categoryId) return ApiResponse.error('Item name and category are required.', 400);

    const category = await prisma.itemCategory.findFirst({ where: { id: categoryId, status: true }, select: { id: true } });
    if (!category) return ApiResponse.error('Select an active item category.', 400);

    const item = await prisma.itemMaster.create({
      data: {
        name,
        categoryId,
        description: String(body?.description || '').trim() || null,
        unit: String(body?.unit || 'unit').trim() || 'unit',
        manufacturer: String(body?.manufacturer || '').trim() || null,
        modelNumber: String(body?.modelNumber || '').trim() || null,
        status: body?.status !== false,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return ApiResponse.success(item, 'Item master created.', 201);
  } catch (error) {
    if (error?.code === 'P2002') return ApiResponse.error('An item with this name already exists in the selected category.', 409);
    console.error('Create item master error:', error);
    return ApiResponse.error('Unable to create item master.', 500, error);
  }
}