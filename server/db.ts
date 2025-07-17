import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is missing!");
  console.error("Please set DATABASE_URL in your environment variables.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔌 Attempting database connection...");
console.log("Database URL format:", process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

let db: any;

try {
  // Use Neon HTTP client for serverless connections
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  console.log('✅ Database connection established successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  console.error('Connection string format should be: postgresql://user:password@host:port/database');
  throw error;
}

// Export a function to test the connection
export async function testConnection() {
  try {
    await db.execute('SELECT 1');
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { db };