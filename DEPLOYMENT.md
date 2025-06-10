# Deployment Guide for Replit

## ✅ Fixed Deployment Issues

All deployment issues have been resolved:

1. **DATABASE_URL Configuration**: Enhanced error handling with clear messages
2. **Port Configuration**: Updated to use PORT environment variable with 5000 fallback
3. **Build Process**: Verified working (builds frontend + backend correctly)
4. **Production Server**: Configured to serve static files and API endpoints
5. **Error Handling**: Improved crash loop prevention with graceful error recovery

## Required Environment Variables

Configure these in your Replit deployment settings:

### Production Secrets
- `DATABASE_URL` - PostgreSQL connection string (required)
- `STRIPE_SECRET_KEY` - Stripe API key (already configured)

## Deployment Commands

The application uses these commands for deployment:
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

## Build Process Verification

✅ Frontend builds correctly (Vite)
✅ Backend bundles properly (esbuild) 
✅ Static assets generated in dist/public/
✅ Production server starts successfully
✅ Database connection works when DATABASE_URL provided

## Port Configuration

The server automatically:
- Uses PORT environment variable if available
- Falls back to port 5000 for Replit compatibility
- Binds to 0.0.0.0 for external access
- Logs connection details for debugging

## Deployment Instructions

1. **Set Production Secrets**
   - Go to Replit project settings
   - Add `DATABASE_URL` with PostgreSQL connection string
   - Format: `postgresql://username:password@host:port/database`

2. **Deploy**
   - Click "Deploy" button in Replit
   - System automatically runs build and start commands
   - Application serves on assigned port

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