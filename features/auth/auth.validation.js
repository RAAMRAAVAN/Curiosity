import { prisma } from "@/server/prisma";

export async function validateSignup(data, options = {}) {
  const {
    name,
    email,
    password,
    dob,
    gender,
    phone,
    address,
    schoolName,
    studyingClass,
    userType,
  } = data;

  const allowedRoles = options.allowRoles || ["student"];
  const validTypes = ["student", "teacher", "admin", "management", "parent"];

  if (!name || !email || !password || !userType) {
    throw new Error("Name, email, password, and user type are required.");
  }

  if (!validTypes.includes(userType)) {
    throw new Error("Invalid user type.");
  }

  if (!allowedRoles.includes(userType)) {
    throw new Error("This user type cannot be registered here.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  const validGenders = ["Male", "Female", "Other", "Prefer not to say"];

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email.");
  }

  if (phone && !phoneRegex.test(phone)) {
    throw new Error("Invalid phone number.");
  }

  if (gender && !validGenders.includes(gender)) {
    throw new Error("Invalid gender selection.");
  }

  if (dob && isNaN(Date.parse(dob))) {
    throw new Error("Invalid date of birth.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (userType === "student") {
    if (!dob || !gender || !phone || !address || !schoolName || !studyingClass) {
      throw new Error("All student fields are required.");
    }
  }

  if (studyingClass) {
    const classRecord = await prisma.class.findUnique({
      where: { id: studyingClass },
    });

    if (!classRecord) {
      throw new Error("Selected class does not exist.");
    }
  }
}

export function validateLogin(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
}