import { prisma } from './server/prisma.js';

const main = async () => {
  const deleteOperations = [
    prisma.assessmentReattemptRequest.deleteMany(),
    prisma.assessmentResult.deleteMany(),
    prisma.assessmentOption.deleteMany(),
    prisma.assessmentQuestion.deleteMany(),
    prisma.assessment.deleteMany(),
  ];

  await Promise.all(deleteOperations);

  const counts = await Promise.all([
    prisma.assessment.count(),
    prisma.assessmentQuestion.count(),
    prisma.assessmentOption.count(),
    prisma.assessmentResult.count(),
    prisma.assessmentReattemptRequest.count(),
  ]);

  console.log(JSON.stringify({
    assessments: counts[0],
    questions: counts[1],
    options: counts[2],
    results: counts[3],
    reattempts: counts[4],
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
