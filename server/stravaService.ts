import axios from 'axios';
import { storage } from './storage';

if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
  throw new Error('STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET environment variables must be set');
}

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';
const REDIRECT_URI = process.env.REPLIT_DOMAINS ? 
  `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/strava/callback` : 
  'http://localhost:5000/api/strava/callback';

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
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectUri = process.env.STRAVA_REDIRECT_URI || `${process.env.REPLIT_DEV_DOMAIN}/api/strava/callback`;
    const scope = 'activity:write,activity:read_all';
    
    return `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=${scope}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<any> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return await response.json();
  }

  static async disconnectStrava(userId: string): Promise<void> {
    const { storage } = await import('./storage');
    await storage.disconnectStrava(userId);
  }

  static async pushWorkoutToStrava(userId: string, workoutData: any): Promise<boolean> {
    const { storage } = await import('./storage');
    return await storage.pushWorkoutToStrava(userId, workoutData);
  }
  static getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      approval_prompt: 'force',
      scope: 'activity:write'
    });
    
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string): Promise<StravaTokens> {
    try {
      const response = await axios.post(STRAVA_AUTH_URL, {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
    try {
      const response = await axios.post(STRAVA_AUTH_URL, {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return response.data;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
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

      const response = await axios.post(`${STRAVA_BASE_URL}/activities`, activityData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Successfully created Strava activity:', response.data.id);
      return true;
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