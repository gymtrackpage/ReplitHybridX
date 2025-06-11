import strava from 'strava-v3';
import { storage } from './storage';

if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
  throw new Error('STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET environment variables must be set');
}

strava.config({
  access_token: 'your_access_token',
  client_id: process.env.STRAVA_CLIENT_ID,
  client_secret: process.env.STRAVA_CLIENT_SECRET,
  redirect_uri: process.env.REPLIT_DOMAINS ? 
    `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/strava/callback` : 
    'http://localhost:5000/api/strava/callback'
});

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface WorkoutData {
  name: string;
  description: string;
  duration: number; // in seconds
  distance?: number; // in meters
  type: 'workout' | 'run' | 'crosstraining';
  start_date_local: string; // ISO date string
}

export class StravaService {
  static getAuthorizationUrl(): string {
    return strava.oauth.getRequestAccessURL({
      scope: 'activity:write'
    });
  }

  static async exchangeCodeForTokens(code: string): Promise<StravaTokens> {
    return new Promise((resolve, reject) => {
      strava.oauth.getToken(code, (err: any, payload: StravaTokens) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      });
    });
  }

  static async refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
    return new Promise((resolve, reject) => {
      strava.oauth.refreshToken(refreshToken, (err: any, payload: StravaTokens) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      });
    });
  }

  static async getValidAccessToken(userId: string): Promise<string | null> {
    const user = await storage.getUser(userId);
    if (!user?.stravaAccessToken || !user.stravaRefreshToken) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = user.stravaTokenExpiry ? Math.floor(user.stravaTokenExpiry.getTime() / 1000) : 0;
    
    if (expiryTime - 300 < now) {
      try {
        // Refresh the token
        const tokens = await this.refreshAccessToken(user.stravaRefreshToken);
        
        // Update user with new tokens
        await storage.updateUser(userId, {
          stravaAccessToken: tokens.access_token,
          stravaRefreshToken: tokens.refresh_token,
          stravaTokenExpiry: new Date(tokens.expires_at * 1000),
        });
        
        return tokens.access_token;
      } catch (error) {
        console.error('Failed to refresh Strava token:', error);
        // Clear invalid tokens
        await storage.updateUser(userId, {
          stravaAccessToken: null,
          stravaRefreshToken: null,
          stravaTokenExpiry: null,
          stravaConnected: false,
        });
        return null;
      }
    }

    return user.stravaAccessToken;
  }

  static async pushWorkoutToStrava(userId: string, workoutData: WorkoutData): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        throw new Error('No valid Strava access token');
      }

      // Configure strava with the user's access token
      strava.config({ access_token: accessToken });

      const activityData = {
        name: workoutData.name,
        type: this.mapWorkoutTypeToStravaType(workoutData.type),
        sport_type: this.mapWorkoutTypeToStravaSportType(workoutData.type),
        start_date_local: workoutData.start_date_local,
        elapsed_time: workoutData.duration,
        description: workoutData.description,
        trainer: true, // Mark as indoor/gym workout
        ...(workoutData.distance && { distance: workoutData.distance })
      };

      return new Promise((resolve, reject) => {
        strava.activities.create(activityData, (err: any, result: any) => {
          if (err) {
            console.error('Failed to create Strava activity:', err);
            reject(err);
          } else {
            console.log('Successfully created Strava activity:', result.id);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Error pushing workout to Strava:', error);
      return false;
    }
  }

  private static mapWorkoutTypeToStravaType(type: string): string {
    switch (type.toLowerCase()) {
      case 'run':
      case 'running':
        return 'Run';
      case 'workout':
      case 'crosstraining':
      case 'hyrox':
      case 'strength':
        return 'Workout';
      case 'bike':
      case 'cycling':
        return 'Ride';
      default:
        return 'Workout';
    }
  }

  private static mapWorkoutTypeToStravaSportType(type: string): string {
    switch (type.toLowerCase()) {
      case 'run':
      case 'running':
        return 'Run';
      case 'workout':
      case 'crosstraining':
      case 'hyrox':
      case 'strength':
        return 'CrossTraining';
      case 'bike':
      case 'cycling':
        return 'Ride';
      default:
        return 'CrossTraining';
    }
  }

  static async disconnectStrava(userId: string): Promise<void> {
    await storage.updateUser(userId, {
      stravaUserId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiry: null,
      stravaConnected: false,
    });
  }
}