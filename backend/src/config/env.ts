import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'vms-super-secret-default-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_CLIENT_URL: process.env.ADMIN_CLIENT_URL || 'http://localhost:5173',
  MOBILE_CLIENT_URL: process.env.MOBILE_CLIENT_URL || 'http://localhost:8081',
};
