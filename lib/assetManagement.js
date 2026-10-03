export const getAssetCenterScope = (actor) => {
  if (actor?.isAdmin) return null;
  return Array.from(new Set(
    (Array.isArray(actor?.assignedCenterIds) ? actor.assignedCenterIds : [])
      .map((centerId) => String(centerId || '').trim())
      .filter(Boolean)
  ));
};

export const canAccessAssetCenter = (actor, centerId) =>
  Boolean(actor?.isAdmin || (centerId && actor?.canAccessCenter?.(String(centerId).trim())));

export const normalizeAssetText = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

export const parseAssetDate = (value) => {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === '') return { ok: true, value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false, value: null };
  return { ok: true, value: date };
};
export const buildCodePrefix = (name) => {
  const letters = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  return letters.length >= 2 ? letters : (letters + 'XX').slice(0, 3);
};

export const normalizeCodePrefix = (value) => {
  const prefix = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{2,6}$/.test(prefix) ? prefix : null;
};

export const uniqueCodePrefix = async (db, name, excludeId) => {
  const base = buildCodePrefix(name);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}${attempt + 1}`;
    const existing = await db.itemCategory.findFirst({
      where: { codePrefix: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error('Unable to generate a unique category code.');
};

// Atomic per-category counter so codes never repeat under concurrent creates.
export const generateAssetCode = async (db, categoryId) => {
  const category = await db.itemCategory.update({
    where: { id: categoryId },
    data: { codeCounter: { increment: 1 } },
    select: { codePrefix: true, codeCounter: true },
  });
  return `${category.codePrefix}-${String(category.codeCounter).padStart(5, '0')}`;
};

export const generateTransferNo = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
  return `TRF-${stamp}-${random}`;
};

export const recordAssetEvent = (db, event) => db.assetEvent.create({
  data: {
    assetId: event.assetId,
    type: event.type,
    centerId: event.centerId ?? null,
    fromCenterId: event.fromCenterId ?? null,
    toCenterId: event.toCenterId ?? null,
    quantity: event.quantity ?? null,
    remarks: normalizeAssetText(event.remarks),
    performedById: event.performedById ?? null,
    referenceNo: event.referenceNo ?? null,
    vendor: normalizeAssetText(event.vendor),
    cost: event.cost ?? null,
  },
});

// Serialises concurrent stock changes on one asset within a transaction.
export const lockAsset = (tx, assetId) => tx.$queryRaw`SELECT id FROM asset_list WHERE id = ${assetId} FOR UPDATE`;

export const parseMoney = (value) => {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? { ok: true, value: amount } : { ok: false, value: null };
};

export const getReservedQuantity = async (db, assetId, excludeTransferId) => {
  const result = await db.assetTransfer.aggregate({
    where: { assetId, status: 'PENDING', ...(excludeTransferId ? { id: { not: excludeTransferId } } : {}) },
    _sum: { quantity: true },
  });
  return result._sum.quantity || 0;
};

export const resolveNames = async (db, { centerIds = [], userIds = [] }) => {
  const centers = Array.from(new Set(centerIds.filter(Boolean)));
  const users = Array.from(new Set(userIds.filter(Boolean)));
  const [centerRows, userRows] = await Promise.all([
    centers.length ? db.center.findMany({ where: { id: { in: centers } }, select: { id: true, name: true } }) : [],
    users.length ? db.user.findMany({ where: { id: { in: users } }, select: { id: true, name: true } }) : [],
  ]);
  return {
    centers: Object.fromEntries(centerRows.map((row) => [row.id, row.name])),
    users: Object.fromEntries(userRows.map((row) => [row.id, row.name])),
  };
};
