import axios from 'axios';
import { storage } from './storage';
import FormData from 'form-data';

// Environment variables will be checked in individual methods rather than at module load

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';
// Use the current Replit domain for redirect URI
const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN ? 
  `https://${process.env.REPLIT_DEV_DOMAIN}/api/strava/callback` :
  `https://${process.env.REPL_ID || '0fcc3a45-589d-49fb-a059-7d9954da233f'}-00-${process.env.REPL_OWNER || '8sst6tp6qylm'}.spock.replit.dev/api/strava/callback`;

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
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      throw new Error('STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET environment variables must be set');
    }
    
    console.log("Strava Client ID:", process.env.STRAVA_CLIENT_ID ? "Set" : "Not set");
    console.log("Redirect URI:", REDIRECT_URI);
    
    // According to Strava API docs, use approval_prompt=auto for better UX
    // and include activity:read for better compatibility
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      approval_prompt: 'auto',
      scope: 'activity:write,activity:read'
    });
    
    const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
    console.log("Generated Auth URL:", authUrl);
    return authUrl;
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

  static async pushWorkoutToStrava(
    userId: string, 
    workoutData: WorkoutData, 
    imageBuffer?: Buffer
  ): Promise<{ success: boolean; activityId?: number }> {
    try {
      console.log('Attempting to push workout to Strava for user:', userId);
      console.log('Workout data:', workoutData);
      
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        console.error('No valid Strava access token found');
        throw new Error('No valid Strava access token');
      }

      console.log('Valid access token found, preparing activity data');

      // Ensure we have valid data
      if (!workoutData.name || workoutData.name.trim() === '') {
        throw new Error('Workout name is required');
      }

      if (!workoutData.duration || workoutData.duration <= 0) {
        throw new Error('Valid workout duration is required');
      }

      // Validate and format start date
      let startDate = workoutData.start_date_local;
      try {
        const dateObj = new Date(startDate);
        if (isNaN(dateObj.getTime())) {
          startDate = new Date().toISOString();
        }
      } catch {
        startDate = new Date().toISOString();
      }

      const activityData = {
        name: workoutData.name.trim(),
        type: this.mapWorkoutTypeToStravaType(workoutData.type),
        sport_type: this.mapWorkoutTypeToStravaSportType(workoutData.type),
        start_date_local: startDate,
        elapsed_time: Math.max(60, Math.floor(workoutData.duration)), // Minimum 1 minute
        description: workoutData.description || 'Workout completed using HybridX training app',
        trainer: true, // Mark as indoor/gym workout
        commute: false,
        ...(workoutData.distance && workoutData.distance > 0 && { distance: workoutData.distance })
      };

      console.log('Activity data to send to Strava:', activityData);

      const response = await axios.post(`${STRAVA_BASE_URL}/activities`, activityData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      const activityId = response.data.id;
      console.log('Successfully created Strava activity with ID:', activityId);
      console.log('Strava response data:', response.data);

      // Upload image if provided
      if (imageBuffer && activityId) {
        try {
          await this.uploadActivityPhoto(accessToken, activityId, imageBuffer);
          console.log('Successfully uploaded workout image to Strava activity');
        } catch (photoError) {
          console.error('Failed to upload photo to Strava activity:', photoError);
          // Don't fail the entire operation if photo upload fails
        }
      }

      return { success: true, activityId };
    } catch (error: any) {
      console.error('Error pushing workout to Strava:', error);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      
      // Re-throw the error so it can be handled by the calling function
      throw error;
    }
  }

  static async uploadActivityPhoto(
    accessToken: string, 
    activityId: number, 
    imageBuffer: Buffer
  ): Promise<void> {
    try {
      const form = new FormData();
      
      form.append('file', imageBuffer, {
        filename: 'workout-share.png',
        contentType: 'image/png'
      });

      const response = await axios.post(
        `${STRAVA_BASE_URL}/activities/${activityId}/photos`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${accessToken}`
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log('Photo upload response:', response.status);
    } catch (error) {
      console.error('Error uploading photo to Strava:', error);
      throw error;
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
        return 'WeightTraining';
      case 'bike':
      case 'cycling':
        return 'Ride';
      case 'weighttraining':
      case 'weight':
        return 'WeightTraining';
      default:
        return 'WeightTraining';
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