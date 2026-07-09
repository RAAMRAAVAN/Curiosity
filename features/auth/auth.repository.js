import { prisma } from "@/server/prisma";

export const authRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  createUser(data) {
    return prisma.user.create({
      data,
    });
  },
};