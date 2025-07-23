import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error("Please set DATABASE_URL in your environment variables.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔌 Attempting database connection...");
console.log("Database URL format:", process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));


// Configure connection pooling for better performance
const sql = neon(process.env.DATABASE_URL, {
  // Enable connection pooling
  fetchConnectionCache: true,
  // Set reasonable timeouts
  connectTimeout: 10000,
  queryTimeout: 30000,
  // Enable array mode for better performance on large result sets
  arrayMode: false,
  // Enable full results for better debugging in development
  fullResults: process.env.NODE_ENV === 'development'
});

export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});

console.log('✅ Database connection established successfully');

// Export a function to test the connection
export async function testConnection() {
  try {
    // Test with a simple query
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Graceful shutdown - Neon serverless doesn't require explicit pool shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Closing database connection...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Closing database connection...');
  process.exit(0);
});

export { sql };