import { resolveNames } from '@/lib/assetManagement';
import { prisma } from '@/server/prisma';

export const transferInclude = {
  asset: {
    select: {
      id: true,
      assetCode: true,
      serialNumber: true,
      quantity: true,
      itemMaster: { select: { name: true, unit: true, category: { select: { name: true } } } },
    },
  },
};

export const attachTransferNames = async (transfers) => {
  const names = await resolveNames(prisma, {
    centerIds: transfers.flatMap((item) => [item.fromCenterId, item.toCenterId]),
    userIds: transfers.flatMap((item) => [item.requestedById, item.respondedById]),
  });
  return transfers.map((item) => ({
    ...item,
    fromCenterName: names.centers[item.fromCenterId] || '-',
    toCenterName: names.centers[item.toCenterId] || '-',
    requestedByName: names.users[item.requestedById] || '-',
    respondedByName: item.respondedById ? names.users[item.respondedById] || '-' : null,
  }));
};
