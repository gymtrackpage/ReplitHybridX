# Deployment Guide for Replit

## Required Environment Variables

Before deploying, ensure these environment variables are configured in your Replit deployment settings:

### Production Secrets
- `DATABASE_URL` - PostgreSQL connection string (required)

## Deployment Steps

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Configure Deployment Secrets**
   - In Replit, go to your project settings
   - Navigate to "Secrets" or "Environment Variables"
   - Add `DATABASE_URL` with your PostgreSQL connection string

3. **Deploy**
   - Click the "Deploy" button in Replit
   - The deployment will use the following configuration:
     - Build command: `npm run build`
     - Start command: `npm run start`
     - Port: 5000

## Build Process

The build process performs these steps:
1. Builds the frontend using Vite
2. Bundles the backend using esbuild
3. Creates production-ready files in the `dist` directory

## Production Start

The production server:
- Runs on port 5000 (required for Replit)
- Serves static frontend files
- Provides API endpoints
- Uses the built files from the `dist` directory

## Troubleshooting

### Common Issues

1. **Application crashes on startup**
   - Check that `DATABASE_URL` is properly set
   - Verify database connection string format

2. **Build fails**
   - Ensure all dependencies are installed
   - Check TypeScript compilation errors

3. **Database connection issues**
   - Verify database is accessible
   - Check connection string format
   - Ensure database exists and is provisioned

### Logs

Check the deployment logs for specific error messages:
- Look for database connection errors
- Verify environment variables are loaded
- Check for missing dependencies