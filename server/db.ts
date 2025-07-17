
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

// Create the Neon HTTP client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance with Neon HTTP client
const db = drizzle(sql, { schema });

console.log('✅ Database connection established successfully');

// Export a function to test the connection
export async function testConnection() {
  try {
    // Test with a simple query using Drizzle
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { db };
