import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient, UserRole, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

type AuthRequest = Request & { user?: { id: number; role: UserRole } };

const tokenFor = (user: { id: number; role: UserRole }) =>
  jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });

const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required' });
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret) as jwt.JwtPayload;
    req.user = { id: Number(payload.sub), role: payload.role as UserRole };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const admin = (req: AuthRequest, res: Response, next: NextFunction) =>
  req.user?.role === UserRole.ADMIN ? next() : res.status(403).json({ message: 'Admin access required' });

const asyncRoute = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'dashdarkx-backend' }));

app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z.string().min(8).max(100),
  }).parse(req.body);
  const email = body.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ message: 'Email already exists' });
  const user = await prisma.user.create({
    data: { name: body.name, email, passwordHash: await bcrypt.hash(body.password, 12) },
    select: { id: true, name: true, email: true, role: true },
  });
  res.status(201).json({ token: tokenFor(user), user });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const body = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return res.status(401).json({ message: 'Invalid email or password' });
  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ token: tokenFor(safe), user: safe });
}));

app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
}));

app.get('/api/users', auth, admin, asyncRoute(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
}));

app.patch('/api/users/:id', auth, admin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid user id' });
  const schema = z.object({
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid user data' });
  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    });
    res.json({ user });
  } catch {
    res.status(409).json({ message: 'Email may already be in use or user does not exist' });
  }
}));

app.delete('/api/users/:id', auth, admin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid user id' });
  if (id === req.user?.id) return res.status(400).json({ message: 'You cannot delete your own account' });
  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ message: 'User not found' });
  }
}));

app.get('/api/products', auth, asyncRoute(async (_req, res) => {
  res.json({ products: await prisma.product.findMany({ orderBy: { createdAt: 'desc' } }) });
}));

app.post('/api/products', auth, admin, asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().min(2), price: z.number().nonnegative(), inStock: z.number().int().nonnegative() }).parse(req.body);
  res.status(201).json({ product: await prisma.product.create({ data: body }) });
}));

app.patch('/api/products/:id', auth, admin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const body = z.object({ name: z.string().min(2).optional(), price: z.number().nonnegative().optional(), inStock: z.number().int().nonnegative().optional() }).parse(req.body);
  res.json({ product: await prisma.product.update({ where: { id }, data: body }) });
}));

app.delete('/api/products/:id', auth, admin, asyncRoute(async (req, res) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

app.get('/api/orders', auth, asyncRoute(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const orders = await prisma.order.findMany({
    where: search ? { OR: [
      { country: { contains: search } },
      { client: { name: { contains: search } } },
      { client: { email: { contains: search } } },
    ] } : undefined,
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: { date: 'desc' },
  });
  res.json({ orders });
}));

app.post('/api/orders', auth, admin, asyncRoute(async (req, res) => {
  const body = z.object({
    clientId: z.number().int().positive(),
    country: z.string().min(2),
    total: z.number().positive(),
    status: z.nativeEnum(OrderStatus).default(OrderStatus.pending),
  }).parse(req.body);
  res.status(201).json({ order: await prisma.order.create({ data: body, include: { client: true } }) });
}));

app.patch('/api/orders/:id', auth, admin, asyncRoute(async (req, res) => {
  const body = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    country: z.string().min(2).optional(),
    total: z.number().positive().optional(),
  }).parse(req.body);
  res.json({ order: await prisma.order.update({ where: { id: Number(req.params.id) }, data: body, include: { client: true } }) });
}));

app.delete('/api/orders/:id', auth, admin, asyncRoute(async (req, res) => {
  await prisma.order.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
}));

app.get('/api/dashboard/summary', auth, asyncRoute(async (_req, res) => {
  const [stock, orders, delivered, customers, revenue] = await Promise.all([
    prisma.product.aggregate({ _sum: { inStock: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: OrderStatus.delivered } }),
    prisma.user.count({ where: { role: UserRole.USER } }),
    prisma.order.aggregate({ _sum: { total: true } }),
  ]);
  res.json({ stats: {
    stockProducts: stock._sum.inStock ?? 0,
    orders, deliveredOrders: delivered, customers,
    revenue: Number((revenue._sum.total ?? 0).toFixed(2)),
  } });
}));

app.get('/api/dashboard/revenue', auth, asyncRoute(async (_req, res) => {
  const rows = await prisma.order.findMany({ select: { date: true, total: true } });
  const categories = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const current = categories.map((_, month) => rows.filter(x => x.date.getMonth() === month).reduce((s, x) => s + x.total, 0));
  res.json({ categories, series: [
    { name: 'Current clients', data: current },
    { name: 'Subscribers', data: current.map(x => x * 0.45) },
    { name: 'New customers', data: current.map(x => x * 0.30) },
  ] });
}));

app.get('/api/dashboard/tasks', auth, (_req, res) =>
  res.json({ total: 257, rate: 16.8, series: [0,130,130,300,90,220,180,240,90], categories: ['Jan1','Jan8','Jan16','Jan24','Jan31','Feb1','Feb8','Feb16','Feb24'] }));

app.get('/api/dashboard/visitors', auth, (_req, res) =>
  res.json({ current: 18420, previous: 16110, sources: [
    { name: 'Direct', value: 7200 }, { name: 'Search', value: 5200 },
    { name: 'Social', value: 3900 }, { name: 'Referral', value: 2120 },
  ] }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation failed', issues: err.issues });
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => console.log(`DashDarkX API running on http://localhost:${port}`));