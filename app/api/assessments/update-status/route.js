import { ApiResponse } from '@/utils/apiResponse';
import { getAssessmentOperationStatus } from '@/lib/assessmentUpdateStatus';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const operationId = searchParams.get('operationId');

    if (!operationId) {
      return ApiResponse.error('operationId is required', 400);
    }

    const status = await getAssessmentOperationStatus(operationId);
    return ApiResponse.success(status || {
      state: 'PENDING',
      message: 'Waiting for backend status update...',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return ApiResponse.error('Unable to load update status', 500, error);
  }
}
