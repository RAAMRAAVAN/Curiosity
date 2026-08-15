import { prisma } from '@/server/prisma';
import { ApiResponse } from '@/utils/apiResponse';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ApiResponse.success({ ok: true }, 'Database is reachable');
  } catch (error) {
    console.error('DB health check failed:', error);
    return ApiResponse.error(
      'Database is unavailable. Check your local DB or Neon connection.',
      503,
      {
        detail: error?.message || 'Unknown database error',
      }
    );
  }
}
