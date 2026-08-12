import { authRepository } from "./auth.repository";
import { hashPassword, comparePassword } from "@/lib/hash";
import { signToken } from "@/server/jwt";
import { prisma } from "@/server/prisma";
import { toUserDto } from "./auth.dto";

function buildProfileData(data, role) {
  const profileData = {};

  if (data.dob !== undefined) {
    profileData.dob = data.dob ? new Date(data.dob) : null;
  }
  if (data.gender !== undefined) {
    profileData.gender = data.gender;
  }
  if (data.phone !== undefined) {
    profileData.phone = data.phone;
  }
  if (data.address !== undefined) {
    profileData.address = data.address;
  }

  if (role !== "TEACHER") {
    if (data.schoolName !== undefined) {
      profileData.schoolName = data.schoolName;
    }
    if (data.studyingClass !== undefined) {
      profileData.studyingClass = data.studyingClass;
    }
  }

  return profileData;
}

export async function signupService(data) {
  const existing = await authRepository.findByEmail(data.email);

  if (existing) {
    throw new Error("User already exists.");
  }

  const hashedPassword = await hashPassword(data.password);
  const role = data.userType?.toUpperCase() || "STUDENT";

  const user = await authRepository.createUser({
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role,
    centerId: data.centerId || null,
  });

  const profileData = buildProfileData(data, role);
  if (Object.keys(profileData).length > 0 || role === "TEACHER") {
    await authRepository.createRoleProfile(user.id, role, {
      ...profileData,
      centerId: data.centerId || null,
      ...(role === "TEACHER" ? { name: user.name } : {}),
    });
  }

  const userWithProfile = await authRepository.findById(user.id);

  return {
    token: signToken(userWithProfile),
    user: toUserDto(userWithProfile),
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

  const setting = await prisma.appSetting.findUnique({
    where: { key: "admin.classNavigationPreference" },
  });

  const userDto = toUserDto(user);

  return {
    token: signToken(user),
    user: {
      ...userDto,
      classNavigationPreference: setting?.value || "contents",
    },
  };
}