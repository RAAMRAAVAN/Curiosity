import { authRepository } from "./auth.repository";
import { hashPassword, comparePassword } from "@/lib/hash";
import { signToken } from "@/server/jwt";
import { toUserDto } from "./auth.dto";

export async function signupService(data) {
  const existing = await authRepository.findByEmail(data.email);

  if (existing) {
    throw new Error("User already exists.");
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await authRepository.createUser({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    dob: new Date(data.dob),
    gender: data.gender,
    phone: data.phone,
    address: data.address,
    schoolName: data.schoolName,
    studyingClass: data.studyingClass,
    role: data.userType?.toUpperCase() || "STUDENT",
  });

  return {
    token: signToken(user),
    user: toUserDto(user),
  };
}

export async function loginService(data) {
  const user = await authRepository.findByEmail(data.email);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const valid = await comparePassword(
    data.password,
    user.password
  );

  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  return {
    token: signToken(user),
    user: toUserDto(user),
  };
}