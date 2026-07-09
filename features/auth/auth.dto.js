export function toUserDto(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    userType: user.role?.toLowerCase(),
    dob: user.dob,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    schoolName: user.schoolName,
    studyingClass: user.studyingClass,
    createdAt: user.createdAt,
  };
}