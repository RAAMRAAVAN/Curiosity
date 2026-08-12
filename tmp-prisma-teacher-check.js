const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'Teacher' AND column_name = 'phone'
    `;
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
