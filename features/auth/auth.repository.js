import { prisma } from "@/server/prisma";

export const authRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        teacher: true,
        student: true,
        admin: true,
        management: true,
        parent: true,
      },
    });
  },

  findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        teacher: true,
        student: true,
        admin: true,
        management: true,
        parent: true,
      },
    });
  },

  createUser(data) {
    return prisma.user.create({
      data,
    });
  },

  createRoleProfile(userId, role, profileData) {
    if (!profileData || Object.keys(profileData).length === 0) {
      return null;
    }

    const data = { userId, ...profileData };

    switch (role) {
      case "STUDENT":
        return prisma.student.create({ data });
      case "ADMIN":
        return prisma.admin.create({ data });
      case "MANAGEMENT":
        return prisma.management.create({ data });
      case "PARENT":
        return prisma.parent.create({ data });
      case "TEACHER":
        return prisma.teacher.create({ data });
      default:
        return null;
    }
  },
};