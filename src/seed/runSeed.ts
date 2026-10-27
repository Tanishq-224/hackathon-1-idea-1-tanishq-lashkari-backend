import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { VenueConfig } from '../models/VenueConfig.js';
import { hashPassword } from '../utils/password.js';
import { SEED_AREAS, SEED_SHIFTS, SEED_TABLES } from './venueSeedData.js';

/**
 * @description Seeds venue configuration and optional bootstrap staff/admin accounts.
 * @returns {Promise<void>}
 */
export async function runSeed(): Promise<void> {
  await VenueConfig.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      areas: [...SEED_AREAS],
      tables: [...SEED_TABLES],
      shifts: [...SEED_SHIFTS],
      closedDays: [],
    },
    { upsert: true, new: true },
  );

  const bootstrapAccounts: Array<{
    email: string;
    password: string;
    role: 'staff' | 'admin';
    name: string;
  }> = [];

  if (env.STAFF_BOOTSTRAP_EMAIL && env.STAFF_BOOTSTRAP_PASSWORD) {
    bootstrapAccounts.push({
      email: env.STAFF_BOOTSTRAP_EMAIL,
      password: env.STAFF_BOOTSTRAP_PASSWORD,
      role: 'staff',
      name: 'Iturrieta Staff',
    });
  }
  if (env.ADMIN_BOOTSTRAP_EMAIL && env.ADMIN_BOOTSTRAP_PASSWORD) {
    bootstrapAccounts.push({
      email: env.ADMIN_BOOTSTRAP_EMAIL,
      password: env.ADMIN_BOOTSTRAP_PASSWORD,
      role: 'admin',
      name: 'Iturrieta Admin',
    });
  }

  for (const account of bootstrapAccounts) {
    if (!account.email || !account.password) {
      continue;
    }
    const email = account.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      continue;
    }
    await User.create({
      name: account.name,
      email,
      passwordHash: await hashPassword(account.password),
      role: account.role,
      emailVerified: true,
      isActive: true,
    });
  }
}
