/**
 * One-time migration: multiply all active product prices by 1.025
 * to ensure sellers receive their intended amount after the 2.5% platform fee.
 *
 * Run from apps/api:
 *   npx ts-node --project tsconfig.json -e "require('./scripts/apply-fee-adjustment')"
 * Or if ts-node isn't available:
 *   node -r ts-node/register scripts/apply-fee-adjustment.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, title: true, price: true },
  });

  console.log(`Found ${products.length} active listings.\n`);

  let changed = 0;
  for (const product of products) {
    const newPrice = Math.round(product.price * 1.025 * 100) / 100;
    if (Math.abs(newPrice - product.price) < 0.001) continue;
    await prisma.product.update({ where: { id: product.id }, data: { price: newPrice } });
    console.log(`  ✓ ${product.title}: GHS ${product.price.toFixed(2)} → GHS ${newPrice.toFixed(2)}`);
    changed++;
  }

  console.log(`\nDone. Adjusted ${changed} of ${products.length} listings (+2.5% fee markup applied).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
