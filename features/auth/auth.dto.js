export function toUserDto(user) {
  const profile =
    user.student ||
    user.teacher ||
    user.admin ||
    user.management ||
    user.parent ||
    {};

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    userType: user.role?.toLowerCase(),
    dob: profile.dob ?? null,
    gender: profile.gender ?? null,
    phone: profile.phone ?? null,
    address: profile.address ?? null,
    schoolName: profile.schoolName ?? null,
    studyingClass: profile.studyingClass ?? null,
    createdAt: user.createdAt,
  };
}