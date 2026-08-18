require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.assessmentReattemptRequest.deleteMany();
  await prisma.assessmentResult.deleteMany();
  await prisma.assessmentOption.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessment.deleteMany();

  const counts = await Promise.all([
    prisma.assessment.count(),
    prisma.assessmentQuestion.count(),
    prisma.assessmentOption.count(),
    prisma.assessmentResult.count(),
    prisma.assessmentReattemptRequest.count(),
  ]);

  // console.log(JSON.stringify({
  //   assessments: counts[0],
  //   questions: counts[1],
  //   options: counts[2],
  //   results: counts[3],
  //   reattempts: counts[4],
  // }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
