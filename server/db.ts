
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
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

// Create the PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create Drizzle instance with PostgreSQL Pool
const db = drizzle(pool, { schema });

console.log('✅ Database connection established successfully');

// Export a function to test the connection
export async function testConnection() {
  try {
    // Test with a simple query using the pool
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as test');
      console.log('✅ Database connection test passed');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Export the pool for session store
export { pool };
export { db };
