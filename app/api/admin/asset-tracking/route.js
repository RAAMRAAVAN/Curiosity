import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getAssetCenterScope, resolveNames } from '@/lib/assetManagement';

const assetInclude = {
  itemMaster: { include: { category: { select: { id: true, name: true } } } },
  center: { select: { id: true, name: true } },
};

// Walks split parents so a child asset shows the history it inherited.
const loadChain = async (asset) => {
  const chain = [asset];
  let current = asset;
  while (current.parentAssetId && chain.length < 20) {
    const parent = await prisma.assetList.findUnique({ where: { id: current.parentAssetId } });
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
};

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'asset_tracking.view');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const url = new URL(req.url);
    const query = String(url.searchParams.get('q') || '').trim();
    const assetId = String(url.searchParams.get('id') || '').trim();
    if (!query && !assetId) return ApiResponse.error('Enter an asset code or serial number.', 400);

    const scope = getAssetCenterScope(auth.actor);
    const scopeFilter = scope === null ? {} : {
      OR: [
        { centerId: { in: scope } },
        { events: { some: { OR: [{ centerId: { in: scope } }, { fromCenterId: { in: scope } }, { toCenterId: { in: scope } }] } } },
      ],
    };
    const matches = await prisma.assetList.findMany({
      where: {
        ...(assetId ? { id: assetId } : {
          OR: [
            { assetCode: { equals: query, mode: 'insensitive' } },
            { serialNumber: { equals: query, mode: 'insensitive' } },
            { assetTag: { equals: query, mode: 'insensitive' } },
          ],
        }),
        ...scopeFilter,
      },
      include: assetInclude,
      take: 20,
    });
    if (!matches.length) return ApiResponse.error('No asset found for this asset code or serial number.', 404);

    if (matches.length > 1) {
      return ApiResponse.success({
        matches: matches.map((item) => ({ id: item.id, assetCode: item.assetCode, serialNumber: item.serialNumber, itemName: item.itemMaster?.name, centerName: item.center?.name })),
        asset: null,
        events: [],
      });
    }

    const asset = matches[0];
    const chain = await loadChain(asset);
    const events = await prisma.assetEvent.findMany({
      where: {
        OR: chain.map((item, index) => ({
          assetId: item.id,
          // Parent events after the split belong to the parent only.
          ...(index > 0 ? { createdAt: { lte: chain[index - 1].createdAt } } : {}),
        })),
      },
      orderBy: { createdAt: 'asc' },
    });

    const names = await resolveNames(prisma, {
      centerIds: events.flatMap((event) => [event.centerId, event.fromCenterId, event.toCenterId]),
      userIds: events.map((event) => event.performedById),
    });
    const codeById = Object.fromEntries(chain.map((item) => [item.id, item.assetCode]));

    return ApiResponse.success({
      matches: [],
      asset,
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        assetCode: codeById[event.assetId],
        centerName: event.centerId ? names.centers[event.centerId] || null : null,
        fromCenterName: event.fromCenterId ? names.centers[event.fromCenterId] || null : null,
        toCenterName: event.toCenterId ? names.centers[event.toCenterId] || null : null,
        quantity: event.quantity,
        remarks: event.remarks,
        referenceNo: event.referenceNo,
        vendor: event.vendor,
        cost: event.cost == null ? null : String(event.cost),
        performedByName: event.performedById ? names.users[event.performedById] || null : null,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    console.error('Asset tracking error:', error);
    return ApiResponse.error('Unable to load asset journey.', 500, error);
  }
}
