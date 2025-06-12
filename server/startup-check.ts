
export async function performStartupChecks() {
  console.log("🔍 Performing startup checks...\n");
  
  const checks = {
    environment: false,
    database: false,
    dependencies: false
  };

  // Check environment variables
  console.log("1. Checking environment variables...");
  const requiredVars = ['DATABASE_URL'];
  const optionalVars = ['STRIPE_SECRET_KEY', 'STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName} is set`);
    } else {
      console.log(`   ❌ ${varName} is missing (required)`);
      return false;
    }
  }
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName} is set`);
    } else {
      console.log(`   ⚠️  ${varName} is missing (optional)`);
    }
  }
  checks.environment = true;

  // Check dependencies
  console.log("\n2. Checking dependencies...");
  try {
    await import('@neondatabase/serverless');
    await import('drizzle-orm/neon-serverless');
    console.log("   ✅ Database dependencies loaded");
    checks.dependencies = true;
  } catch (error) {
    console.log("   ❌ Failed to load dependencies:", error);
    return false;
  }

  // Check database connection
  console.log("\n3. Testing database connection...");
  try {
    const { testConnection } = await import('./db');
    const dbConnected = await testConnection();
    checks.database = dbConnected;
  } catch (error) {
    console.log("   ❌ Database connection failed:", error);
    return false;
  }

  const allChecksPass = Object.values(checks).every(check => check);
  
  if (allChecksPass) {
    console.log("\n🎉 All startup checks passed!");
  } else {
    console.log("\n❌ Some startup checks failed");
  }
  
  return allChecksPass;
}
