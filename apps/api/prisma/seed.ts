import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const SALT_ROUNDS = 12;
  const defaultPassword = await bcrypt.hash('Test1234!', SALT_ROUNDS);

  const seller = await prisma.user.upsert({
    where: { email: 'seller@htu.edu.gh' },
    update: {},
    create: {
      email: 'seller@htu.edu.gh',
      name: 'Ama N.',
      password: defaultPassword,
      avatar: 'A',
      verified: true,
      premium: true,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@htu.edu.gh' },
    update: {},
    create: {
      email: 'buyer@htu.edu.gh',
      name: 'Kojo D.',
      password: defaultPassword,
      avatar: 'K',
      verified: false,
      premium: false,
    },
  });

  await prisma.businessProfile.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      name: 'Ama Campus Services',
      type: 'Student business',
      description: 'Trusted campus seller offering useful products and services around HTU and Ho.',
      location: 'HTU Campus / Ho',
      phone: '+233 50 000 0000',
      verified: true,
      premium: true,
    },
  });

  const demoProducts = [
    {
      title: 'Math and programming tutoring',
      description: 'One-on-one tutoring for calculus, programming basics, and exam revision.',
      price: 60,
      condition: 'New',
      location: 'Ho Technical University',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
      imageStyle: 'art-services',
      featured: true,
      boosted: false,
      negotiable: true,
      active: true,
      category: 'Services',
      tags: 'tutoring,lectures,programming',
      views: 144,
      postedAt: new Date('2026-03-13T09:00:00.000Z'),
    },
    {
      title: 'Used MacBook Air 2020',
      description: 'Well-kept MacBook Air with 8GB RAM, 256GB SSD, charger included.',
      price: 2500,
      condition: 'Like new',
      location: 'HTU Computer Lab',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
      imageStyle: 'art-laptop',
      featured: true,
      boosted: true,
      negotiable: true,
      active: true,
      category: 'Electronics',
      tags: 'laptop,apple,computer',
      views: 248,
      postedAt: new Date('2026-03-12T10:00:00.000Z'),
    },
    {
      title: 'Second-hand lecture notes bundle',
      description: 'Complete electronics and programming notes, perfect for exam prep.',
      price: 120,
      condition: 'Good',
      location: 'SRC Cafeteria',
      imageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80',
      imageStyle: 'art-notes',
      featured: false,
      boosted: false,
      negotiable: true,
      active: true,
      category: 'Notes',
      tags: 'notes,study,engineering',
      views: 156,
      postedAt: new Date('2026-03-10T13:30:00.000Z'),
    },
    {
      title: 'Ghanaian dashiki jacket',
      description: 'Traditional dashiki in excellent condition, size M.',
      price: 220,
      condition: 'Like new',
      location: 'Main Gate',
      imageUrl: 'https://images.unsplash.com/photo-1520975914172-2c8e0f7fb247?auto=format&fit=crop&w=900&q=80',
      imageStyle: 'art-shade',
      featured: false,
      boosted: true,
      negotiable: false,
      active: true,
      category: 'Clothing',
      tags: 'fashion,culture,style',
      views: 89,
      postedAt: new Date('2026-03-09T09:15:00.000Z'),
    },
  ];

  for (const productData of demoProducts) {
    const existing = await prisma.product.findFirst({
      where: { sellerId: seller.id, title: productData.title },
    });

    if (!existing) {
      await prisma.product.create({ data: { ...productData, sellerId: seller.id } });
    }
  }

  const [p1, p2] = await prisma.product.findMany({
    where: { sellerId: seller.id },
    orderBy: { postedAt: 'desc' },
    take: 2,
  });

  if (p1 && p2) {
    for (const { productId, price } of [
      { productId: p1.id, price: p1.price },
      { productId: p2.id, price: p2.price },
    ]) {
      const existing = await prisma.order.findFirst({ where: { buyerId: buyer.id, productId } });
      if (!existing) {
        await prisma.order.create({ data: { buyerId: buyer.id, productId, price } });
      }
    }
  }

  const demoEvents = [
    {
      title: 'HTU Entrepreneurship Fair',
      description: 'Student makers, local vendors, and campus service providers can reserve tables and meet buyers.',
      location: 'HTU Auditorium',
      eventDate: new Date('2026-06-05T10:00:00.000Z'),
      category: 'Business opportunity',
      opportunity: 'Vendor signups open',
      imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80',
    },
    {
      title: 'Exam Prep Tutoring Week',
      description: 'Tutors can list revision sessions and students can discover affordable academic support.',
      location: 'Engineering Block',
      eventDate: new Date('2026-06-12T15:00:00.000Z'),
      category: 'Campus update',
      opportunity: 'Tutoring services promoted',
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
    },
  ];

  for (const event of demoEvents) {
    const existing = await prisma.campusEvent.findFirst({ where: { title: event.title } });
    if (!existing) {
      await prisma.campusEvent.create({ data: event });
    }
  }

  console.log('Seed complete. Default password for all seed users: Test1234!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
