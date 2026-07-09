const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'rambaburai911@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  console.log('Exact lookup result:', user);

  const candidates = await prisma.user.findMany({
    where: {
      email: {
        contains: 'rambaburai911',
      },
    },
  });
  console.log('Partial lookup results:', candidates);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
