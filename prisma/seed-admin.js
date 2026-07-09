const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "ram.ray@example.com";
  const adminPassword = "Admin@123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.deleteMany({
    where: {
      role: "STUDENT",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Ram Ray",
      password: hashedPassword,
      role: "ADMIN",
      dob: new Date("1980-01-01"),
      gender: "Male",
      phone: "+0000000000",
      address: "Admin Office",
      schoolName: "Kokrajhar Academy",
      studyingClass: "N/A",
    },
    create: {
      name: "Ram Ray",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      dob: new Date("1980-01-01"),
      gender: "Male",
      phone: "+0000000000",
      address: "Admin Office",
      schoolName: "Kokrajhar Academy",
      studyingClass: "N/A",
    },
  });

  console.log("Admin user created or updated:", admin.email);
  console.log("Admin login email:", adminEmail);
  console.log("Admin login password:", adminPassword);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
