const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DEFAULT_USER = {
  email: 'ram.ray@curiosity.com',
  password: '#Ram911!',
  name: 'Ram Ray',
};

async function main() {
  const prisma = new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ||
      'postgresql://curiosity_user:%23Ram911!@localhost:5432/curiosity_db',
  });

  try {
    const existing = await prisma.user.findUnique({
      where: { email: DEFAULT_USER.email },
      include: { admin: true },
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(DEFAULT_USER.password, 10);

      const user = await prisma.user.create({
        data: {
          name: DEFAULT_USER.name,
          email: DEFAULT_USER.email,
          password: hashedPassword,
          role: 'ADMIN',
          admin: {
            create: {
              dob: new Date('1980-01-01'),
              gender: 'Male',
              phone: '+0000000000',
              address: 'Admin Office',
              schoolName: 'Curiosity Academy',
              studyingClass: 'N/A',
            },
          },
        },
      });

      // console.log('Default admin user created:', user.email);
      // console.log('Default admin password:', DEFAULT_USER.password);
      return;
    }

    const passwordMatches = await bcrypt.compare(DEFAULT_USER.password, existing.password);
    const needsUpdate = existing.role !== 'ADMIN' || !passwordMatches;

    if (needsUpdate) {
      const hashedPassword = await bcrypt.hash(DEFAULT_USER.password, 10);
      const updated = await prisma.user.update({
        where: { email: DEFAULT_USER.email },
        data: {
          role: 'ADMIN',
          password: hashedPassword,
          name: DEFAULT_USER.name,
        },
      });

      // console.log('Default admin user updated:', updated.email);
      // console.log('Default admin password:', DEFAULT_USER.password);
      return;
    }

    // console.log('Default admin user already exists:', existing.email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to ensure default admin user:', error);
  process.exit(1);
});
