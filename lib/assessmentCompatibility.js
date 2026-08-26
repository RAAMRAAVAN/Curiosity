import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/server/prisma';

const isUnsupportedPrismaFieldError = (error) => {
  if (!error || typeof error.message !== 'string') {
    return false;
  }

  return (
    error instanceof Prisma.PrismaClientValidationError ||
    /Unknown argument|Unknown field|does not exist|does not support/i.test(error.message)
  );
};

const normalizeGradeBands = (gradeBands) => {
  if (typeof gradeBands === 'string') {
    return gradeBands;
  }

  return JSON.stringify(gradeBands || []);
};

const generateRecordId = () => randomUUID();

let schemaEnsurePromise = null;
let schemaEnsuredAt = 0;
const SCHEMA_ENSURE_TTL_MS = 5 * 60 * 1000;

export const ensureAssessmentSchemaColumns = async (prismaClient = prisma) => {
  const now = Date.now();
  if (schemaEnsuredAt && now - schemaEnsuredAt < SCHEMA_ENSURE_TTL_MS) {
    return;
  }

  if (schemaEnsurePromise) {
    await schemaEnsurePromise;
    return;
  }

  const statements = [
    'ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "total_marks" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "grade_bands" TEXT',
    'ALTER TABLE "assessment_questions" ADD COLUMN IF NOT EXISTS "marks" INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE "assessment_questions" ADD COLUMN IF NOT EXISTS "question_desc" TEXT',
    'ALTER TABLE "assessment_results" ADD COLUMN IF NOT EXISTS "total_marks" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "assessment_results" ADD COLUMN IF NOT EXISTS "percentage" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE "assessment_results" ADD COLUMN IF NOT EXISTS "grade" TEXT',
  ];

  schemaEnsurePromise = (async () => {
    for (const statement of statements) {
      try {
        await prismaClient.$executeRawUnsafe(statement);
      } catch (error) {
        if (!isUnsupportedPrismaFieldError(error) && !/already exists|duplicate column/i.test(error.message || '')) {
          console.warn('Unable to ensure assessment schema column:', error.message || error);
        }
      }
    }

    schemaEnsuredAt = Date.now();
  })();

  try {
    await schemaEnsurePromise;
  } finally {
    schemaEnsurePromise = null;
  }
};

const persistAssessmentMetadata = async (tx, assessmentId, totalMarks, gradeBands) => {
  try {
    const sql = 'UPDATE "assessments" SET "total_marks" = $1, "grade_bands" = $2 WHERE "id" = $3';
    await tx.$executeRawUnsafe(sql, Number(totalMarks) || 0, normalizeGradeBands(gradeBands), assessmentId);
  } catch (error) {
    if (!isUnsupportedPrismaFieldError(error)) {
      console.warn('Unable to persist assessment metadata via raw SQL:', error.message || error);
    }
  }
};

const persistAssessmentQuestion = async (tx, data) => {
  try {
    const result = await tx.$queryRawUnsafe(
      'INSERT INTO "assessment_questions" ("id", "assessment_id", "question_text", "question_desc", "marks", "display_order", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING "id"',
      generateRecordId(),
      data.assessmentId,
      data.questionText,
      data.questionDesc ?? null,
      Number(data.marks) || 1,
      Number(data.displayOrder) || 1,
      true
    );

    if (Array.isArray(result) && result[0]) {
      return { id: result[0].id };
    }

    return { id: null };
  } catch (error) {
    if (isUnsupportedPrismaFieldError(error)) {
      return tx.assessmentQuestion.create({
        data: {
          assessmentId: data.assessmentId,
          questionText: data.questionText,
          questionDesc: data.questionDesc ?? null,
          displayOrder: data.displayOrder,
          status: true,
        },
      });
    }

    throw error;
  }
};

const persistAssessmentResult = async (tx, data) => {
  try {
    const result = await tx.$queryRawUnsafe(
      'INSERT INTO "assessment_results" ("id", "assessment_id", "user_id", "score", "total_questions", "total_marks", "percentage", "grade", "answers", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING "id"',
      generateRecordId(),
      data.assessmentId,
      data.userId,
      Number(data.score) || 0,
      Number(data.totalQuestions) || 0,
      Number(data.totalMarks) || 0,
      Number(data.percentage) || 0,
      data.grade || null,
      data.answers ?? null,
      true
    );

    if (Array.isArray(result) && result[0]) {
      return { id: result[0].id };
    }

    return { id: null };
  } catch (error) {
    if (isUnsupportedPrismaFieldError(error)) {
      return tx.assessmentResult.create({
        data: {
          assessmentId: data.assessmentId,
          userId: data.userId,
          score: data.score ?? 0,
          totalQuestions: data.totalQuestions ?? 0,
          answers: data.answers ?? null,
        },
      });
    }

    throw error;
  }
};

const persistAssessmentResultUpdate = async (tx, id, data) => {
  try {
    await tx.$executeRawUnsafe(
      'UPDATE "assessment_results" SET "score" = $1, "total_questions" = $2, "total_marks" = $3, "percentage" = $4, "grade" = $5, "answers" = $6 WHERE "id" = $7',
      Number(data.score) || 0,
      Number(data.totalQuestions) || 0,
      Number(data.totalMarks) || 0,
      Number(data.percentage) || 0,
      data.grade || null,
      data.answers ?? null,
      id
    );

    return { id };
  } catch (error) {
    if (isUnsupportedPrismaFieldError(error)) {
      return tx.assessmentResult.update({
        where: { id },
        data: {
          score: data.score ?? 0,
          totalQuestions: data.totalQuestions ?? 0,
          answers: data.answers ?? null,
        },
      });
    }

    throw error;
  }
};

export const buildAssessmentBaseData = (data) => ({
  title: data.title,
  description: data.description,
  type: data.type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'ASSESSMENT',
  classId: data.classId,
  subjectId: data.subjectId || null,
  chapterId: data.chapterId || null,
});

export const createAssessmentRecord = async (tx, data) => {
  const baseData = buildAssessmentBaseData(data);

  try {
    const created = await tx.assessment.create({
      data: {
        ...baseData,
      },
    });

    await persistAssessmentMetadata(tx, created.id, data.totalMarks ?? 0, data.gradeBands ?? null);
    return created;
  } catch (error) {
    if (isUnsupportedPrismaFieldError(error)) {
      const created = await tx.assessment.create({ data: baseData });
      await persistAssessmentMetadata(tx, created.id, data.totalMarks ?? 0, data.gradeBands ?? null);
      return created;
    }

    throw error;
  }
};

export const updateAssessmentRecord = async (tx, assessmentId, data) => {
  const baseData = buildAssessmentBaseData(data);

  try {
    const updated = await tx.assessment.update({
      where: { id: assessmentId },
      data: baseData,
    });

    await persistAssessmentMetadata(tx, assessmentId, data.totalMarks ?? 0, data.gradeBands ?? null);
    return updated;
  } catch (error) {
    if (isUnsupportedPrismaFieldError(error)) {
      const updated = await tx.assessment.update({
        where: { id: assessmentId },
        data: baseData,
      });

      await persistAssessmentMetadata(tx, assessmentId, data.totalMarks ?? 0, data.gradeBands ?? null);
      return updated;
    }

    throw error;
  }
};

export const createAssessmentQuestionRecord = async (tx, data) => {
  return persistAssessmentQuestion(tx, data);
};

export const createAssessmentResultRecord = async (tx, data) => {
  return persistAssessmentResult(tx, data);
};

export const updateAssessmentResultRecord = async (tx, id, data) => {
  return persistAssessmentResultUpdate(tx, id, data);
};

export const getAssessmentMetadata = async (prismaClient, assessmentId) => {
  await ensureAssessmentSchemaColumns(prismaClient);

  try {
    const result = await prismaClient.$queryRawUnsafe(
      'SELECT "total_marks" AS "totalMarks", "grade_bands" AS "gradeBands" FROM "assessments" WHERE "id" = $1 LIMIT 1',
      assessmentId
    );

    if (Array.isArray(result) && result[0]) {
      return {
        totalMarks: Number(result[0].totalMarks) || 0,
        gradeBands: result[0].gradeBands || null,
      };
    }
  } catch (error) {
    console.warn('Unable to load assessment metadata via raw SQL:', error.message || error);
  }

  return { totalMarks: 0, gradeBands: null };
};
