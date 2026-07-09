import { NextResponse } from "next/server";

import { signupService } from "@/features/auth/auth.service";
import { validateSignup } from "@/features/auth/auth.validation";

import { ApiResponse } from "@/utils/apiResponse";
import { setAuthCookie } from "@/server/cookie";

export async function POST(req) {
  try {
    const body = await req.json();

    // Validate request
    validateSignup(body);

    // Create user
    const { user, token } = await signupService(body);

    // Create response
    const response = ApiResponse.success(
      user,
      "User registered successfully.",
      201
    );

    // Store JWT in HttpOnly Cookie
    setAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("Signup Error:", error);

    return ApiResponse.error(
      error.message || "Internal Server Error",
      400
    );
  }
}