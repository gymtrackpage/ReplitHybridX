import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is missing!");
  console.error("Please set DATABASE_URL in your environment variables.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔌 Attempting database connection...");
console.log("Database URL format:", process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

let pool: Pool;
let db: any;

try {
  // Initialize pool with proper error handling
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
  });

  // Test the pool connection before creating drizzle instance
  await pool.query('SELECT 1');
  
  db = drizzle(pool, { schema });
  console.log('✅ Database connection established successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  console.error('Connection string format should be: postgresql://user:password@host:port/database');
  
  // Fallback: try direct connection if pool fails
  try {
    console.log('🔄 Attempting direct connection...');
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    db = drizzle(sql, { schema });
    pool = null; // Set pool to null to indicate direct connection
    console.log('✅ Direct database connection established');
  } catch (fallbackError) {
    console.error('❌ Direct connection also failed:', fallbackError);
    throw fallbackError;
  }
}

// Export a function to test the connection
export async function testConnection() {
  try {
    if (pool) {
      await pool.query('SELECT 1');
    } else {
      // Test with drizzle if using direct connection
      await db.execute('SELECT 1');
    }
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { pool, db };