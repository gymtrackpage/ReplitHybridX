# HybridX Training App

## Overview

HybridX is a comprehensive HYROX training application designed to provide personalized fitness programs with workout tracking, progress monitoring, and mobile capabilities. The application combines a full-stack web architecture with mobile app deployment through Capacitor, offering users both web and native mobile experiences.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds
- **Mobile**: Capacitor for cross-platform mobile app deployment

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon Database
- **Session Storage**: PostgreSQL sessions table for authentication state
- **File Uploads**: In-memory processing with multer for CSV/XLSX program uploads

## Key Components

### Authentication & Authorization
- Replit Auth integration for seamless user authentication
- Admin role-based access control for program management
- Session-based authentication with secure cookie handling

### Program Management System
- CSV/XLSX upload functionality for training program creation
- Dynamic program selection based on user assessment
- Phase-based program progression (PREP → MAIN → MAINTENANCE)
- Support for multiple program types: Beginner, Intermediate, Advanced, Strength, Running, Doubles

### Workout System
- Structured workout scheduling with week/day organization
- Exercise tracking with sets, reps, duration, and notes
- Workout completion tracking with ratings and progress monitoring
- Random workout generation for variety

### Assessment & Personalization
- Comprehensive fitness assessment for program recommendation
- User profile management with fitness level tracking
- Goal-based program customization

### Third-Party Integrations
- **Strava**: OAuth integration for workout sharing and activity sync
- **Stripe**: Payment processing for subscription management and referral reward tracking
- **Referral System**: Complete referral tracking with 6-character codes and automatic reward processing

### Mobile Features
- Progressive Web App (PWA) capabilities
- Capacitor integration for native Android/iOS deployment
- Touch-optimized mobile-first UI design
- Offline-capable design patterns

## Data Flow

1. **User Onboarding**: Authentication → Assessment → Program Selection → Dashboard
2. **Workout Flow**: Today's Workout → Exercise Execution → Completion Tracking → Progress Updates
3. **Program Management**: Admin Upload → CSV Parsing → Database Storage → User Assignment
4. **Data Sync**: Frontend State (TanStack Query) ↔ REST API ↔ PostgreSQL Database

## External Dependencies

### Required Services
- **Neon Database**: PostgreSQL hosting for production data
- **Replit Auth**: User authentication and session management

### Optional Integrations
- **Strava API**: Activity sharing and fitness data sync
- **Stripe API**: Subscription and payment processing
- **SendGrid**: Email notifications (configured but not actively used)

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Capacitor CLI**: Mobile app building and deployment
- **XLSX Library**: Spreadsheet parsing for program uploads

## Deployment Strategy

### Web Deployment
- **Platform**: Replit with autoscale deployment target
- **Build Process**: Vite production build with ESBuild server bundling
- **Environment**: Node.js 20 with PostgreSQL 16 module

### Mobile Deployment
- **Android**: Capacitor-generated Android project for APK building
- **Build Options**: Local Android Studio build or cloud build services
- **Configuration**: HTTPS scheme with mixed content support for development

### Development Workflow
- **Hot Reload**: Vite dev server with HMR
- **Database**: Drizzle push for schema synchronization
- **Testing**: Built-in startup checks for environment validation

## Changelog

Changelog:
- June 16, 2025: Initial setup
- June 16, 2025: Successfully implemented complete Strava integration with OAuth authentication, workout sharing, and automated image generation. Fixed sport_type validation issues, response stream handling errors, and activity detection logic. Strava sharing now works perfectly with custom workout images uploaded to activities. All workouts consistently categorized as "WeightTraining" sport type.
- June 30, 2025: Implemented comprehensive referral system with 6-character codes, shareable URLs, automatic tracking, Stripe webhook integration for milestone monitoring, and reward processing. Added referral dashboard with stats display and mobile-friendly UI components. System prevents duplicate referrals and includes proper error handling.
- January 2, 2025: Fixed critical Stripe subscription setup issues. Improved payment intent client secret extraction with multiple fallback methods (manual payment intent creation, setup intent fallback). Enhanced error handling to prevent users from being redirected to assessment on payment failures. Added referral access section to profile page for easy user access.

## User Preferences

Preferred communication style: Simple, everyday language.