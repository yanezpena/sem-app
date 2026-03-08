import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Food', slug: 'food' },
  { name: 'Transport', slug: 'transport' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Bills', slug: 'bills' },
  { name: 'Shopping', slug: 'shopping' },
  { name: 'Healthcare', slug: 'healthcare' },
  { name: 'Parking', slug: 'parking' },
  { name: 'Gas', slug: 'gas' },
  { name: 'Car Service', slug: 'car-service' },
  { name: 'Other', slug: 'other' },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
