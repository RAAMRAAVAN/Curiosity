import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssetCenterScope } from '@/lib/assetManagement';
import { paginateArray, parsePagination } from '@/lib/pagination';

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'asset_reports.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const scope = getAssetCenterScope(auth.actor);
    const rows = await prisma.assetList.groupBy({
      by: ['centerId', 'itemMasterId', 'lifecycle'],
      where: { status: true, ...(scope === null ? {} : { centerId: { in: scope } }) },
      _sum: { quantity: true, purchaseCost: true },
      _count: { _all: true },
    });

    const [centers, items] = await Promise.all([
      prisma.center.findMany({ where: { id: { in: [...new Set(rows.map((row) => row.centerId))] } }, select: { id: true, name: true } }),
      prisma.itemMaster.findMany({
        where: { id: { in: [...new Set(rows.map((row) => row.itemMasterId))] } },
        select: { id: true, name: true, unit: true, category: { select: { id: true, name: true } } },
      }),
    ]);
    const centerById = Object.fromEntries(centers.map((center) => [center.id, center.name]));
    const itemById = Object.fromEntries(items.map((item) => [item.id, item]));

    const pending = await prisma.assetTransfer.findMany({
      where: { status: 'PENDING', ...(scope === null ? {} : { fromCenterId: { in: scope } }) },
      select: { quantity: true, fromCenterId: true, asset: { select: { itemMasterId: true } } },
    });
    const inTransit = {};
    pending.forEach((transfer) => {
      const key = `${transfer.fromCenterId}|${transfer.asset.itemMasterId}`;
      inTransit[key] = (inTransit[key] || 0) + transfer.quantity;
    });

    // One row per center + item with a quantity column per lifecycle state.
    const merged = {};
    rows.forEach((row) => {
      const key = `${row.centerId}|${row.itemMasterId}`;
      const item = itemById[row.itemMasterId];
      const entry = merged[key] || (merged[key] = {
        centerId: row.centerId,
        centerName: centerById[row.centerId] || '-',
        itemId: row.itemMasterId,
        itemName: item?.name || '-',
        unit: item?.unit || '',
        categoryId: item?.category?.id || '',
        categoryName: item?.category?.name || '-',
        available: 0,
        underRepair: 0,
        disposed: 0,
        inTransit: inTransit[key] || 0,
        records: 0,
        totalCost: 0,
      });
      const quantity = row._sum.quantity || 0;
      if (row.lifecycle === 'AVAILABLE') entry.available += quantity;
      if (row.lifecycle === 'UNDER_REPAIR') entry.underRepair += quantity;
      if (row.lifecycle === 'DISPOSED') entry.disposed += quantity;
      entry.records += row._count._all;
      entry.totalCost += Number(row._sum.purchaseCost || 0);
    });
    const pagination = parsePagination(req);
    if (!pagination) return ApiResponse.success(Object.values(merged));

    const groupBy = ['center', 'category', 'item', 'centerItem'].includes(pagination.params.get('groupBy')) ? pagination.params.get('groupBy') : 'center';
    const centerFilter = pagination.params.get('centerId');
    const categoryFilter = pagination.params.get('categoryId');
    const query = pagination.search.toLowerCase();
    const all = Object.values(merged);
    const filterOptions = {
      centers: Array.from(new Map(all.map((row) => [row.centerId, row.centerName]))).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      categories: Array.from(new Map(all.map((row) => [row.categoryId, row.categoryName]))).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    };

    const keyFor = {
      center: (row) => row.centerId,
      category: (row) => row.categoryId,
      item: (row) => row.itemId,
      centerItem: (row) => `${row.centerId}|${row.itemId}`,
    }[groupBy];
    const groups = new Map();
    const totals = { available: 0, underRepair: 0, inTransit: 0, disposed: 0, totalCost: 0 };
    all
      .filter((row) => (!centerFilter || row.centerId === centerFilter) && (!categoryFilter || row.categoryId === categoryFilter))
      .filter((row) => !query || [row.centerName, row.categoryName, row.itemName].some((value) => String(value || '').toLowerCase().includes(query)))
      .forEach((row) => {
        const key = keyFor(row);
        const group = groups.get(key) || {
          key,
          center: groupBy === 'center' || groupBy === 'centerItem' ? row.centerName : '',
          category: groupBy !== 'center' ? row.categoryName : '',
          item: groupBy === 'item' || groupBy === 'centerItem' ? row.itemName : '',
          available: 0, underRepair: 0, disposed: 0, inTransit: 0, records: 0, totalCost: 0,
        };
        ['available', 'underRepair', 'disposed', 'inTransit', 'records', 'totalCost'].forEach((field) => { group[field] += row[field]; });
        ['available', 'underRepair', 'disposed', 'inTransit', 'totalCost'].forEach((field) => { totals[field] += row[field]; });
        groups.set(key, group);
      });
    const sorted = Array.from(groups.values()).sort((a, b) => `${a.center}${a.category}${a.item}`.localeCompare(`${b.center}${b.category}${b.item}`));
    const { rows: pageRows, meta } = paginateArray(sorted, pagination);
    return ApiResponse.paginated(pageRows, { ...meta, totals, filterOptions });
  } catch (error) {
    console.error('Stock summary error:', error);
    return ApiResponse.error('Unable to load stock summary.', 500, error);
  }
}
