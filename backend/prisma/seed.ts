import { PrismaClient, UserRole, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dashdarkx.local' },
    update: {},
    create: { name: 'Admin', email: 'admin@dashdarkx.local', passwordHash, role: UserRole.ADMIN },
  });

  const customers = [
    ['John Carter', 'hello@johncarter.com'], ['Sophie Moore', 'contact@sophiemoore.com'],
    ['Matt Cannon', 'info@mattcannon.com'], ['Graham Hills', 'hi@grahamhills.com'],
    ['Sandy Houston', 'contact@sandyhouston.com'], ['Andy Smith', 'hello@andysmith.com'],
    ['Emma Grace', 'wow@emmagrace.com'], ['Ava Rose', 'me@avarose.com'],
    ['Olivia Jane', 'info@oliviajane.com'], ['Mason Alexander', 'myinfo@alexander.com'],
    ['Samuel David', 'me@samueldavid.com'], ['Henry Joseph', 'contact@henryjoseph.com'],
  ];

  for (const [name, email] of customers) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, passwordHash: await bcrypt.hash('Customer123!', 10), role: UserRole.USER },
    });
  }

  if ((await prisma.product.count()) === 0) {
    await prisma.product.createMany({
      data: [
        { name: 'iPhone 14 Pro Max', price: 1099, inStock: 524 },
        { name: 'Apple Watch S8', price: 799, inStock: 320 },
        { name: 'MacBook Pro 14', price: 1999, inStock: 87 },
        { name: 'AirPods Pro 2', price: 249, inStock: 145 },
      ],
    });
  }

  if ((await prisma.order.count()) === 0) {
    const users = await prisma.user.findMany({ where: { role: UserRole.USER }, orderBy: { id: 'asc' } });
    const rows = [
      ['United States', 1099.24, OrderStatus.delivered], ['United Kingdom', 5870.32, OrderStatus.canceled],
      ['Australia', 13899.48, OrderStatus.delivered], ['India', 1569.12, OrderStatus.pending],
      ['Canada', 899.16, OrderStatus.delivered], ['United States', 2449.64, OrderStatus.pending],
      ['Australia', 6729.82, OrderStatus.delivered], ['Canada', 784.94, OrderStatus.canceled],
      ['Singapore', 1247.86, OrderStatus.pending], ['United States', 304.89, OrderStatus.delivered],
      ['Japan', 2209.76, OrderStatus.pending], ['North Korea', 5245.68, OrderStatus.delivered],
    ] as const;

    await prisma.order.createMany({
      data: rows.map(([country, total, status], i) => ({
        clientId: users[i % users.length].id,
        country,
        total,
        status,
        date: new Date(Date.now() - i * 3 * 86400000),
      })),
    });
  }

  console.log('Seed complete:', admin.email);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());