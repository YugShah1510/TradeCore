/**
 * Prisma Client Configuration
 * 
 * Creates a single shared instance of PrismaClient for use across the application.
 */

const { PrismaClient } = require('@prisma/client');

// Instantiate PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;

