const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('prisma constructor:', prisma.constructor.name);
console.log('prisma model keys:', Object.keys(prisma).filter(k => k !== '$connect' && k !== '$disconnect' && k !== '$executeRaw' && k !== '$queryRaw' && k !== '$transaction').sort());
console.log('teacherClass property exists:', Object.prototype.hasOwnProperty.call(prisma, 'teacherClass'));
console.log('teacherSubject property exists:', Object.prototype.hasOwnProperty.call(prisma, 'teacherSubject'));
console.log('teacherContent property exists:', Object.prototype.hasOwnProperty.call(prisma, 'teacherContent'));
prisma.$disconnect().then(() => process.exit(0)).catch(() => process.exit(1));
