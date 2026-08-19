import { ApiResponse } from '@/utils/apiResponse';
import { getUserFromRequest } from '@/server/auth';
import { prisma } from '@/server/prisma';
import { comparePassword, hashPassword } from '@/lib/hash';

export async function POST(req) {
  try {
    const authUser = getUserFromRequest(req);
    const userId = authUser?.userId || authUser?.id;

    if (!userId) {
      return ApiResponse.error('Authentication required.', 401);
    }

    const body = await req.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const confirmNewPassword = typeof body.confirmNewPassword === 'string' ? body.confirmNewPassword : '';

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return ApiResponse.error('All password fields are required.', 400);
    }

    if (newPassword.length < 6) {
      return ApiResponse.error('New password must be at least 6 characters.', 400);
    }

    if (newPassword !== confirmNewPassword) {
      return ApiResponse.error('New password and confirmation do not match.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return ApiResponse.error('User account not found.', 404);
    }

    const currentPasswordMatches = await comparePassword(currentPassword, user.password);
    if (!currentPasswordMatches) {
      return ApiResponse.error('Previous password is incorrect.', 400);
    }

    const newPasswordMatches = await comparePassword(newPassword, user.password);
    if (newPasswordMatches) {
      return ApiResponse.error('New password must be different from the previous password.', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword) },
    });

    return ApiResponse.success(null, 'Password updated successfully.');
  } catch (error) {
    console.error('Change password error:', error);
    return ApiResponse.error('Unable to update password.', 500, error);
  }
}