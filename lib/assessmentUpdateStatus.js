import { prisma } from '@/server/prisma';

const STATUS_KEY_PREFIX = 'assessment_update_status:';

const buildKey = (operationId) => `${STATUS_KEY_PREFIX}${operationId}`;

const safeSerialize = (value) => {
  try {
    return JSON.stringify(value || {});
  } catch {
    return JSON.stringify({ state: 'UNKNOWN', message: 'Unable to serialize status payload' });
  }
};

export const updateAssessmentOperationStatus = async (operationId, payload) => {
  if (!operationId) return;

  const value = safeSerialize({
    ...payload,
    updatedAt: new Date().toISOString(),
  });

  await prisma.appSetting.upsert({
    where: { key: buildKey(operationId) },
    create: {
      key: buildKey(operationId),
      value,
    },
    update: {
      value,
    },
  });
};

export const getAssessmentOperationStatus = async (operationId) => {
  if (!operationId) return null;

  const record = await prisma.appSetting.findUnique({
    where: { key: buildKey(operationId) },
  });

  if (!record?.value) return null;

  try {
    return JSON.parse(record.value);
  } catch {
    return {
      state: 'UNKNOWN',
      message: 'Invalid status payload',
      updatedAt: new Date().toISOString(),
    };
  }
};
