import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { normalizeCodePrefix, uniqueCodePrefix } from '@/lib/assetManagement';
import { buildPaginationMeta, containsFilter, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'asset_categories.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const include = { _count: { select: { items: true } } };
    const orderBy = [{ status: 'desc' }, { name: 'asc' }];
    const pagination = parsePagination(req);
    if (pagination) {
      const where = pagination.search
        ? { OR: [{ name: containsFilter(pagination.search) }, { codePrefix: containsFilter(pagination.search) }, { description: containsFilter(pagination.search) }] }
        : {};
      const [total, rows] = await Promise.all([
        prisma.itemCategory.count({ where }),
        prisma.itemCategory.findMany({ where, include, orderBy, skip: pagination.skip, take: pagination.take }),
      ]);
      return ApiResponse.paginated(rows, buildPaginationMeta(total, pagination));
    }

    const categories = await prisma.itemCategory.findMany({ include, orderBy });
    return ApiResponse.success(categories);
  } catch (error) {
    console.error('Load item categories error:', error);
    return ApiResponse.error('Unable to load item categories.', 500, error);
  }
}

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'asset_categories.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    if (!name) return ApiResponse.error('Category name is required.', 400);

    const requestedPrefix = String(body?.codePrefix || '').trim();
    const codePrefix = requestedPrefix ? normalizeCodePrefix(requestedPrefix) : await uniqueCodePrefix(prisma, name);
    if (!codePrefix) return ApiResponse.error('Asset code prefix must be 2-6 letters or digits.', 400);

    const category = await prisma.itemCategory.create({
      data: {
        name,
        codePrefix,
        description: String(body?.description || '').trim() || null,
        status: body?.status !== false,
      },
    });
    return ApiResponse.success(category, 'Item category created.', 201);
  } catch (error) {
    if (error?.code === 'P2002') {
      return ApiResponse.error(String(error?.meta?.target || '').includes('code_prefix') ? 'This asset code prefix is already in use.' : 'A category with this name already exists.', 409);
    }
    console.error('Create item category error:', error);
    return ApiResponse.error('Unable to create item category.', 500, error);
  }
}