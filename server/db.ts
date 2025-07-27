import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as sqlOperator } from "drizzle-orm";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

console.log("🔌 Attempting database connection...");
console.log("Database URL format:", process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

let sql: ReturnType<typeof neon>;
let db: ReturnType<typeof drizzle>;

try {
  // Create Neon client with proper configuration
  sql = neon(process.env.DATABASE_URL!, {
    fetchConnectionCache: true,
  });

  // Use the correct HTTP adapter for Neon
  db = drizzle(sql, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
  });

  console.log("✅ Database connection established successfully");
} catch (error) {
  console.error("❌ Database connection failed:", error);
  throw new Error(`Failed to initialize database connection: ${error.message}`);
}

export { db, sql };

// Export a function to test the connection
export async function testConnection() {
  try {
    // Test with a simple query using drizzle's sql operator
    const result = await db.execute(sqlOperator`SELECT 1 as test`);
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);

    // Try alternative connection test with direct SQL
    try {
      const directResult = await sql`SELECT 1 as test`;
      console.log('✅ Direct SQL connection test passed');
      return true;
    } catch (directError) {
      console.error('❌ Direct SQL connection also failed:', directError);
      return false;
    }
  }
}