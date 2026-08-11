import { prisma } from '../server/prisma';

async function run(){
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, name: true, student: { select: { studyingClass: true } } },
    take: 200,
  });
  console.log(JSON.stringify(students, null, 2));
  process.exit(0);
}

run().catch(e=>{console.error(e); process.exit(1)});
