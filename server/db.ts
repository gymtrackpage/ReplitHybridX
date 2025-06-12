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

let pool: Pool;
let db: any;

try {
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });
  db = drizzle({ client: pool, schema });
  console.log('✅ Database connection established successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  console.error('Connection string format should be: postgresql://user:password@host:port/database');
  throw error;
}

// Export a function to test the connection
export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

export { pool, db };