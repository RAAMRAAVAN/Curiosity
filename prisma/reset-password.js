const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'rambaburai911@gmail.com';
  const password = '#Ram911!';
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashed },
  });

  // console.log('Password reset for', user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
