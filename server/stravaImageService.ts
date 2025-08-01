import * as fs from 'fs';
import * as path from 'path';

export class StravaImageService {
  private static browser: any = null;

  static async initBrowser() {
    if (!this.browser) {
      try {
        const puppeteer = await import('puppeteer');
        this.browser = await puppeteer.default.launch({
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
      } catch (error) {
        console.error('Failed to initialize browser:', error);
        throw new Error('Browser initialization failed');
      }
    }
    return this.browser;
  }

  static createHtmlTemplate(workoutName: string, description: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HybridX Workout Share</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            width: 1200px;
            height: 630px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .share-container {
            width: 1100px;
            height: 530px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .logo-icon {
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
        }

        .logo-text {
            font-size: 28px;
            font-weight: bold;
            color: #2d3748;
        }

        .badge {
            background: #48bb78;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }

        .workout-content {
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 20px;
        }

        .workout-title {
            font-size: 48px;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 10px;
        }

        .workout-description {
            font-size: 20px;
            color: #4a5568;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
        }

        .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .stats {
            display: flex;
            gap: 30px;
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }

        .stat-label {
            font-size: 12px;
            color: #718096;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .app-info {
            text-align: right;
            color: #718096;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="share-container">
        <div class="header">
            <div class="logo">
                <div class="logo-icon">HX</div>
                <div class="logo-text">HybridX</div>
            </div>
            <div class="badge">Workout Completed</div>
        </div>

        <div class="workout-content">
            <div class="workout-title">${workoutName}</div>
            <div class="workout-description">${description}</div>
        </div>

        <div class="footer">
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">💪</div>
                    <div class="stat-label">HYROX</div>
                </div>
                <div class="stat">
                    <div class="stat-value">🔥</div>
                    <div class="stat-label">TRAINING</div>
                </div>
                <div class="stat">
                    <div class="stat-value">⚡</div>
                    <div class="stat-label">COMPLETE</div>
                </div>
            </div>
            <div class="app-info">
                <div>Powered by HybridX</div>
                <div>HYROX Training Platform</div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  static async generateWorkoutImage(workoutName: string, exercises: any[]): Promise<Buffer | null> {
    console.log("🖼️ Generating workout image for:", workoutName);
    console.log("🖼️ Exercises data type:", typeof exercises, "length:", Array.isArray(exercises) ? exercises.length : 'N/A');

    // Validate input
    if (!workoutName || typeof workoutName !== 'string') {
      console.warn("⚠️ Invalid workout name provided for image generation");
      workoutName = "HybridX Workout";
    }

    // Ensure exercises is an array and has valid data
    if (!Array.isArray(exercises)) {
      console.warn("⚠️ Exercises is not an array, converting:", typeof exercises);
      if (typeof exercises === 'string') {
        try {
          exercises = JSON.parse(exercises);
        } catch {
          exercises = [{ name: exercises, type: "exercise" }];
        }
      } else if (exercises && typeof exercises === 'object') {
        exercises = [exercises];
      } else {
        exercises = [];
      }
    }

    // Filter out invalid exercises
    exercises = exercises.filter(ex => ex && (ex.name || ex.exercise || ex.type));

    console.log("🖼️ Processed exercises for image generation:", exercises.length, "valid exercises");

    let browser = null;
    let page = null;

    try {
      // Check if we can initialize browser
      try {
        browser = await this.initBrowser();
        if (!browser) {
          throw new Error('Browser initialization returned null');
        }
      } catch (browserError) {
        console.error('🚫 Browser initialization failed:', browserError);
        return null; // Return null instead of throwing
      }

      page = await browser.newPage();
      
      // Set a shorter timeout for page operations
      await page.setDefaultTimeout(30000);
      await page.setDefaultNavigationTimeout(30000);

      // Process exercises to create description
      let description = '';
      if (exercises && Array.isArray(exercises) && exercises.length > 0) {
        console.log('🖼️ Processing', exercises.length, 'exercises');
        description = exercises.map(exercise => {
          if (typeof exercise === 'string') {
            return exercise;
          } else if (exercise && typeof exercise === 'object' && exercise.name) {
            let exerciseStr = exercise.name;
            if (exercise.sets && exercise.reps) {
              exerciseStr += ` - ${exercise.sets}x${exercise.reps}`;
            } else if (exercise.duration) {
              exerciseStr += ` - ${exercise.duration}`;
            }
            return exerciseStr;
          }
          return '';
        }).filter(Boolean).join(' • ');
      } else {
        console.log('🖼️ No valid exercises provided, using default description');
        description = 'Complete HYROX training session with functional fitness movements';
      }

      // Truncate description if too long
      if (description.length > 150) {
        description = description.substring(0, 147) + '...';
      }

      console.log('🖼️ Final description:', description);

      // Validate and sanitize data
      const safeName = (workoutName || 'HybridX Workout').replace(/[<>"'&]/g, '');
      const safeDescription = description.replace(/[<>"'&]/g, '');

      // Create HTML template
      const htmlTemplate = this.createHtmlTemplate(safeName, safeDescription);

      console.log('🖼️ Setting page content...');

      // Set viewport
      await page.setViewport({ width: 1200, height: 630 });

      // Set page content with shorter timeout
      await page.setContent(htmlTemplate, { 
        waitUntil: 'domcontentloaded', // Changed from networkidle0 for better reliability
        timeout: 30000
      });

      // Wait for rendering
      await page.waitForTimeout(2000);

      console.log('🖼️ Taking screenshot...');

      // Generate image
      const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1200, height: 630 },
        omitBackground: false
      });

      console.log('🖼️ Screenshot taken, buffer size:', imageBuffer.length, 'bytes');

      if (!imageBuffer || imageBuffer.length === 0) {
        console.error('🚫 Generated image buffer is empty');
        return null;
      }

      // Validate the image buffer
      if (imageBuffer.length < 1000) {
        console.error('🚫 Generated image buffer too small:', imageBuffer.length, 'bytes');
        return null;
      }

      return imageBuffer;
    } catch (error: any) {
      console.error('💥 Error generating workout image:');
      console.error('  Error message:', error.message);
      console.error('  Error type:', error.name);
      
      // Return null instead of throwing to allow Strava upload without image
      return null;
    } finally {
      if (page) {
        try {
          await page.close();
          console.log('🖼️ Browser page closed');
        } catch (closeError) {
          console.error('Error closing page:', closeError);
        }
      }
    }
  }

  static async cleanup() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('🖼️ Browser cleanup completed');
      } catch (error) {
        console.error('Error during browser cleanup:', error);
      }
    }
  }
}

// Cleanup on process exit
process.on('exit', () => {
  StravaImageService.cleanup();
});

process.on('SIGINT', () => {
  StravaImageService.cleanup();
  process.exit();
});

process.on('SIGTERM', () => {
  StravaImageService.cleanup();
  process.exit();
});