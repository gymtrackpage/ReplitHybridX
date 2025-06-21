import axios from 'axios';
import { storage } from './storage';
import FormData from 'form-data';

// Environment variables will be checked in individual methods rather than at module load

const STRAVA_BASE_URL = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/token';
// Use the configured Replit domain for redirect URI
const REDIRECT_URI = `https://0fcc3a45-589d-49fb-a059-7d9954da233f-00-8sst6tp6qylm.spock.replit.dev/api/strava/callback`;

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
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000, // 10 second timeout
        responseType: 'json'
      });

      console.log('Raw Strava response:', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });

      const activityId = response.data?.id;
      console.log('Successfully created Strava activity with ID:', activityId);

      if (!activityId) {
        console.error('No activity ID returned from Strava API');
        console.error('Full response data:', JSON.stringify(response.data, null, 2));
        
        // Check if activity was created but ID not returned - fetch recent activities
        try {
          console.log('Checking recent activities for newly created workout...');
          const recentActivitiesResponse = await axios.get(`${STRAVA_BASE_URL}/athlete/activities?per_page=3`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          });
          
          console.log('Recent activities check:', recentActivitiesResponse.data);
          
          if (recentActivitiesResponse.data && recentActivitiesResponse.data.length > 0) {
            // Look for our activity in the recent activities (check first few activities)
            for (let i = 0; i < Math.min(3, recentActivitiesResponse.data.length); i++) {
              const activity = recentActivitiesResponse.data[i];
              console.log(`Checking activity ${i}:`, {
                id: activity.id,
                name: activity.name,
                type: activity.type,
                sport_type: activity.sport_type,
                start_date: activity.start_date,
                elapsed_time: activity.elapsed_time
              });
              
              // Check if this is our activity by comparing name and approximate time
              const activityTime = new Date(activity.start_date);
              const now = new Date();
              const timeDiffMinutes = (now.getTime() - activityTime.getTime()) / (1000 * 60);
              
              if (activity.name === activityData.name && timeDiffMinutes < 5) {
                console.log('Found newly created activity with ID:', activity.id);
                const foundActivityId = activity.id;
                
                // Upload image if provided and we found the activity
                if (imageBuffer && foundActivityId) {
                  try {
                    console.log('Uploading image to activity ID:', foundActivityId);
                    await this.uploadActivityPhoto(accessToken, foundActivityId, imageBuffer);
                    console.log('Successfully uploaded workout image to Strava activity');
                  } catch (photoError) {
                    console.error('Failed to upload photo to Strava activity:', photoError);
                  }
                }
                
                return { success: true, activityId: foundActivityId };
              }
            }
            
            console.log('Could not find matching activity in recent activities');
          }
        } catch (activitiesError) {
          console.error('Failed to fetch recent activities:', activitiesError);
        }
        
        return { success: false };
      }

      // Upload image if provided and we have an activity ID
      if (imageBuffer && activityId) {
        try {
          console.log('🖼️ Preparing to upload image to Strava activity:', activityId);
          console.log('🖼️ Image buffer size:', imageBuffer.length, 'bytes');

          // Wait for the activity to be fully processed by Strava - increased delay
          console.log('⏱️ Waiting for Strava activity to be fully processed...');
          await new Promise(resolve => setTimeout(resolve, 20000)); // Increased to 20 seconds

          // Retry logic for image upload with longer delays
          let uploadSuccess = false;
          let attempts = 0;
          const maxAttempts = 6; // Increased attempts

          while (!uploadSuccess && attempts < maxAttempts) {
            attempts++;
            try {
              console.log(`🔄 Image upload attempt ${attempts}/${maxAttempts}...`);
              
              // Verify activity exists before trying to upload image
              const activityCheck = await axios.get(`${STRAVA_BASE_URL}/activities/${activityId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json'
                },
                timeout: 10000
              });
              
              if (activityCheck.status === 200) {
                console.log('✅ Activity verified, proceeding with image upload');
                await this.uploadActivityPhoto(accessToken, activityId, imageBuffer);
                console.log('✅ Successfully uploaded workout image to Strava activity');
                uploadSuccess = true;
              } else {
                throw new Error(`Activity not ready (status: ${activityCheck.status})`);
              }
            } catch (photoError: any) {
              console.error(`❌ Image upload attempt ${attempts} failed:`, photoError.message);
              
              if (attempts < maxAttempts) {
                // Wait before retry, with exponential backoff
                const waitTime = 8000 * Math.pow(1.5, attempts - 1); // 8s, 12s, 18s, 27s, 40s
                console.log(`⏱️ Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }
          }

          if (!uploadSuccess) {
            console.warn('⚠️ All image upload attempts failed, but activity was created successfully');
            // Return success but with a warning message
            return { 
              success: true, 
              activityId, 
              warning: 'Activity created successfully, but image upload failed. You can manually add images in the Strava app.' 
            };
          }
        } catch (error) {
          console.warn('⚠️ Image upload process failed, but activity was created successfully:', error);
          // Return success but with a warning message
          return { 
            success: true, 
            activityId, 
            warning: 'Activity created successfully, but image upload failed. You can manually add images in the Strava app.' 
          };
        }
      } else {
        if (!imageBuffer) {
          console.log('⚠️ No image buffer provided for Strava upload');
        }
        if (!activityId) {
          console.log('⚠️ No activity ID available for image upload');
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
      console.log(`📤 Uploading photo to Strava activity ${activityId}, image size: ${imageBuffer.length} bytes`);
      
      // Validate image buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer provided');
      }

      // Check if buffer size is reasonable (not too large)
      if (imageBuffer.length > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Image buffer too large for Strava upload');
      }

      // First, verify the activity exists and is accessible
      try {
        const activityCheck = await axios.get(`${STRAVA_BASE_URL}/activities/${activityId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 15000
        });
        console.log('✅ Activity exists and is accessible, proceeding with image upload');
      } catch (checkError: any) {
        if (checkError.response?.status === 404) {
          throw new Error(`Activity ${activityId} not found - activity may not be fully processed yet`);
        }
        if (checkError.response?.status === 403) {
          throw new Error(`Access denied to activity ${activityId} - insufficient permissions`);
        }
        console.warn('⚠️ Activity check failed, but proceeding with upload attempt:', checkError.message);
      }

      const form = new FormData();

      // Use a more specific filename and add proper file extension
      const filename = `hybridx-workout-${activityId}-${Date.now()}.png`;
      
      form.append('file', imageBuffer, {
        filename: filename,
        contentType: 'image/png',
        knownLength: imageBuffer.length
      });

      console.log('📡 Sending photo upload request to Strava...');
      console.log('📡 Upload URL:', `${STRAVA_BASE_URL}/activities/${activityId}/photos`);
      console.log('📡 File name:', filename);

      const response = await axios.post(
        `${STRAVA_BASE_URL}/activities/${activityId}/photos`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 60000, // Increased timeout to 60 seconds
          validateStatus: (status) => {
            // Accept 200-299 status codes
            return status >= 200 && status < 300;
          }
        }
      );

      console.log('📥 Photo upload response status:', response.status);
      console.log('📥 Photo upload response data:', response.data);

      if (response.status === 201 || response.status === 200) {
        console.log('✅ Photo upload successful');
      } else {
        console.warn('⚠️ Photo upload returned unexpected status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: any) {
      console.error('💥 Error uploading photo to Strava:');
      console.error('  Error message:', error.message);
      console.error('  Error code:', error.code);
      console.error('  Response status:', error.response?.status);
      console.error('  Response data:', JSON.stringify(error.response?.data, null, 2));
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        throw new Error(`Activity ${activityId} not found - it may not be fully processed yet. Try again in a few minutes.`);
      } else if (error.response?.status === 413) {
        throw new Error('Image file too large for Strava');
      } else if (error.response?.status === 415) {
        throw new Error('Unsupported image format for Strava');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid image data for Strava upload');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied - insufficient permissions to upload photos to this activity');
      }
      
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