import { loginService } from "@/features/auth/auth.service";
import { validateLogin } from "@/features/auth/auth.validation";

import { ApiResponse } from "@/utils/apiResponse";
import { setAuthCookie } from "@/server/cookie";

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate request
    validateLogin(body);

    // Login user
    const { user, token } = await loginService(body);

    // Create response
    const response = ApiResponse.success(
      user,
      "Login successful."
    );

    // Store JWT
    return setAuthCookie(response, token);
  } catch (error) {
    console.error("Login Error:", error);

    return ApiResponse.error(
      error.message || "Internal Server Error",
      400
    );
  }
}