export function validateSignup(data) {
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

  if (
    !name ||
    !email ||
    !password ||
    !dob ||
    !gender ||
    !phone ||
    !address ||
    !schoolName ||
    !studyingClass ||
    !userType
  ) {
    throw new Error("All fields are required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  const validGenders = ["Male", "Female", "Other", "Prefer not to say"];
  const validTypes = ["student", "teacher", "admin", "parent"];

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email.");
  }

  if (!phoneRegex.test(phone)) {
    throw new Error("Invalid phone number.");
  }

  if (!validGenders.includes(gender)) {
    throw new Error("Invalid gender selection.");
  }

  if (!validTypes.includes(userType)) {
    throw new Error("Invalid user type.");
  }

  if (isNaN(Date.parse(dob))) {
    throw new Error("Invalid date of birth.");
  }

  if (password.length < 6) {
    throw new Error(
      "Password must be at least 6 characters."
    );
  }
}

export function validateLogin(data) {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
}