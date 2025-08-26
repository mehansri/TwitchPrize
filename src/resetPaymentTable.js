import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function resetPaymentTable() {
  await prisma.prizeClaim.deleteMany({});
  console.log("Payment table cleared!");
}

resetPaymentTable()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
