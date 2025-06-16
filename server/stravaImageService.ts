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
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (error) {
        console.error('Failed to initialize browser:', error);
        throw new Error('Browser initialization failed');
      }
    }
    return this.browser;
  }

  static async generateWorkoutImage(workoutName: string, exercises: any[]): Promise<Buffer> {
    console.log('🖼️ Starting image generation for workout:', workoutName);
    console.log('🖼️ Exercises data:', exercises ? exercises.length : 'none');
    
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Read the HTML template
      const templatePath = path.join(__dirname, 'templates', 'strava-share.html');
      console.log('🖼️ Template path:', templatePath);
      
      if (!fs.existsSync(templatePath)) {
        console.error('❌ Template file not found at:', templatePath);
        throw new Error('Strava share template not found');
      }
      
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');
      console.log('🖼️ Template loaded, length:', htmlTemplate.length);

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
        description = 'HYROX Training Session';
      }

      // Truncate description if too long
      if (description.length > 150) {
        description = description.substring(0, 147) + '...';
      }

      console.log('🖼️ Final description:', description);

      // Validate and sanitize data
      const safeName = (workoutName || 'HybridX Workout').replace(/[<>]/g, '');
      const safeDescription = description.replace(/[<>]/g, '');

      // Replace placeholders
      htmlTemplate = htmlTemplate.replace(/\{\{WORKOUT_NAME\}\}/g, safeName);
      htmlTemplate = htmlTemplate.replace(/\{\{WORKOUT_DESCRIPTION\}\}/g, safeDescription);

      console.log('🖼️ Setting page content...');
      // Set page content with extended timeout
      await page.setContent(htmlTemplate, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Set viewport to match the image dimensions
      await page.setViewport({ width: 1200, height: 630 });
      console.log('🖼️ Viewport set to 1200x630');

      // Wait a moment for any animations or loading
      await page.waitForTimeout(1000);

      console.log('🖼️ Taking screenshot...');
      // Generate image with higher quality
      const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1200, height: 630 },
        omitBackground: false
      });

      console.log('🖼️ Screenshot taken, buffer size:', imageBuffer.length, 'bytes');

      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Generated image buffer is empty');
      }

      return imageBuffer;
    } catch (error: any) {
      console.error('💥 Error generating workout image:');
      console.error('  Error message:', error.message);
      console.error('  Error stack:', error.stack);
      throw error;
    } finally {
      await page.close();
      console.log('🖼️ Browser page closed');
    }
  }

  static async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
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