import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL || '';
const needsSsl =
  process.env.PGSSLMODE === 'require' ||
  /sslmode=require/i.test(connectionString) ||
  /\.render\.com|\.neon\.tech|\.supabase\.co/i.test(connectionString);

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg(pool),
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
