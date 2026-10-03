import { randomUUID } from 'node:crypto';
import { ApiResponse } from '@/utils/apiResponse';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { canAccessAssetCenter, normalizeAssetText, parseAssetDate, parseMoney } from '@/lib/assetManagement';

const MAX_ROWS = 500;
const conditions = ['GOOD', 'FAIR', 'NEEDS_REPAIR', 'DAMAGED'];

export async function POST(req) {
  const auth = await requireAdminPermission(req, 'asset_list.create');
  if (!auth.ok) return ApiResponse.error(auth.message, auth.status);

  try {
    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) return ApiResponse.error('No rows to import.', 400);
    if (rows.length > MAX_ROWS) return ApiResponse.error(`A maximum of ${MAX_ROWS} rows can be added at once.`, 400);

    const [items, centers] = await Promise.all([
      prisma.itemMaster.findMany({ where: { status: true, category: { status: true } }, select: { id: true, categoryId: true } }),
      prisma.center.findMany({ where: { status: true }, select: { id: true } }),
    ]);
    const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
    const centerIds = new Set(centers.map((center) => center.id));

    const errors = [];
    const prepared = [];
    const seenSerials = new Set();
    rows.forEach((row, index) => {
      const line = index + 1;
      const fail = (message) => errors.push({ row: line, message });
      const itemMasterId = String(row?.itemMasterId || '').trim();
      const centerId = String(row?.centerId || '').trim();
      const quantity = Number(row?.quantity ?? 1);
      const serialNumber = normalizeAssetText(row?.serialNumber);
      const assetTag = normalizeAssetText(row?.assetTag);
      const condition = row?.condition || 'GOOD';
      const purchaseDate = parseAssetDate(row?.purchaseDate);
      const warrantyExpiry = parseAssetDate(row?.warrantyExpiry);
      const purchaseCost = parseMoney(row?.purchaseCost);

      if (!itemById[itemMasterId]) return fail('Item not found or inactive.');
      if (!centerIds.has(centerId)) return fail('Center not found or inactive.');
      if (!canAccessAssetCenter(auth.actor, centerId)) return fail('You are not authorized for this center.');
      if (!Number.isInteger(quantity) || quantity < 1) return fail('Quantity must be a whole number greater than zero.');
      if (serialNumber && quantity !== 1) return fail('An asset with a serial number must have a quantity of 1.');
      if (!conditions.includes(condition)) return fail('Condition is invalid.');
      if (!purchaseDate.ok) return fail('Purchase date is invalid.');
      if (!warrantyExpiry.ok) return fail('Warranty expiry date is invalid.');
      if (!purchaseCost.ok) return fail('Purchase cost is invalid.');
      if (serialNumber) {
        const key = `${itemMasterId}|${serialNumber.toLowerCase()}`;
        if (seenSerials.has(key)) return fail(`Serial number ${serialNumber} is repeated in this batch.`);
        seenSerials.add(key);
      }
      prepared.push({
        itemMasterId,
        centerId,
        quantity,
        serialNumber,
        assetTag,
        condition,
        location: normalizeAssetText(row?.location),
        purchaseDate: purchaseDate.value ?? null,
        purchaseCost: purchaseCost.value,
        vendor: normalizeAssetText(row?.vendor),
        invoiceNumber: normalizeAssetText(row?.invoiceNumber),
        warrantyExpiry: warrantyExpiry.value ?? null,
        notes: normalizeAssetText(row?.notes),
      });
    });
    if (errors.length) return ApiResponse.error(`Fix ${errors.length} row(s) and retry. Nothing was saved.`, 400, { errors: errors.slice(0, 50) });

    const serials = prepared.filter((row) => row.serialNumber);
    if (serials.length) {
      const existing = await prisma.assetList.findMany({
        where: { OR: serials.map((row) => ({ itemMasterId: row.itemMasterId, serialNumber: row.serialNumber })) },
        select: { serialNumber: true },
        take: 10,
      });
      if (existing.length) {
        return ApiResponse.error(`Serial number(s) already exist: ${existing.map((row) => row.serialNumber).join(', ')}. Nothing was saved.`, 409);
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      // Reserve a block of codes per category in one update.
      const perCategory = {};
      prepared.forEach((row) => {
        const categoryId = itemById[row.itemMasterId].categoryId;
        perCategory[categoryId] = (perCategory[categoryId] || 0) + 1;
      });
      const next = {};
      for (const [categoryId, count] of Object.entries(perCategory)) {
        const category = await tx.itemCategory.update({
          where: { id: categoryId },
          data: { codeCounter: { increment: count } },
          select: { codePrefix: true, codeCounter: true },
        });
        next[categoryId] = { prefix: category.codePrefix, counter: category.codeCounter - count };
      }

      const records = prepared.map((row) => {
        const slot = next[itemById[row.itemMasterId].categoryId];
        slot.counter += 1;
        return { ...row, id: randomUUID(), assetCode: `${slot.prefix}-${String(slot.counter).padStart(5, '0')}` };
      });
      await tx.assetList.createMany({ data: records });
      await tx.assetEvent.createMany({
        data: records.map((row) => ({
          assetId: row.id,
          type: 'PURCHASED',
          centerId: row.centerId,
          quantity: row.quantity,
          remarks: 'Asset added to inventory (bulk entry).',
          vendor: row.vendor,
          cost: row.purchaseCost,
          referenceNo: row.invoiceNumber,
          performedById: auth.actor.userId,
        })),
      });
      return records.length;
    }, { timeout: 60000, maxWait: 10000 });

    return ApiResponse.success({ created }, `${created} asset record(s) added.`, 201);
  } catch (error) {
    if (error?.code === 'P2002') return ApiResponse.error('A serial number or asset tag already exists. Nothing was saved.', 409);
    console.error('Bulk create assets error:', error);
    return ApiResponse.error('Unable to add assets.', 500, error);
  }
}
