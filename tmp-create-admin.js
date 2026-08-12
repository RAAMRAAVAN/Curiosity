const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'ram.ray@curiosity.com';
  const password = '#Ram911!';
  const name = 'Ram Ray';

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        password: hashedPassword,
        role: 'ADMIN',
        admin: {
          upsert: {
            create: {
              dob: new Date('1980-01-01'),
              gender: 'Male',
              phone: '+0000000000',
              address: 'Admin Office',
              schoolName: 'Kokrajhar Academy',
              studyingClass: 'N/A',
            },
            update: {
              dob: new Date('1980-01-01'),
              gender: 'Male',
              phone: '+0000000000',
              address: 'Admin Office',
              schoolName: 'Kokrajhar Academy',
              studyingClass: 'N/A',
            },
          },
        },
      },
    });
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        admin: {
          create: {
            dob: new Date('1980-01-01'),
            gender: 'Male',
            phone: '+0000000000',
            address: 'Admin Office',
            schoolName: 'Kokrajhar Academy',
            studyingClass: 'N/A',
          },
        },
      },
    });
  }

  console.log('Admin user ready:');
  console.log('Email:', email);
  console.log('Password:', password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
