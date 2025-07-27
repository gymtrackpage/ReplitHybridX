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
  // Create Neon client with enhanced configuration
  sql = neon(process.env.DATABASE_URL!, {
    fetchConnectionCache: true,
    fullResults: false, // Optimize for smaller responses
    arrayMode: false,
  });

  // Use the correct HTTP adapter for Neon
  db = drizzle(sql, { 
    schema,
    logger: process.env.NODE_ENV === 'development'
  });

  console.log("✅ Database connection established successfully");
} catch (error: any) {
  console.error("❌ Database connection failed:", error);
  
  // Provide more specific error guidance
  if (error.message?.includes('ENOTFOUND')) {
    console.error("DNS resolution failed - check your DATABASE_URL hostname");
  } else if (error.message?.includes('authentication')) {
    console.error("Authentication failed - check your DATABASE_URL credentials");
  } else if (error.message?.includes('timeout')) {
    console.error("Connection timeout - check network connectivity");
  }
  
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
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);

    // Try alternative connection test with direct SQL
    try {
      const directResult = await sql`SELECT 1 as test`;
      console.log('✅ Direct SQL connection test passed');
      return true;
    } catch (directError: any) {
      console.error('❌ Direct SQL connection also failed:', directError.message);
      
      // Log specific guidance for common errors
      if (directError.message?.includes('client.query is not a function')) {
        console.error('This suggests a Neon adapter configuration issue');
      }
      
      return false;
    }
  }
}