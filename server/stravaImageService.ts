import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

export class StravaImageService {
  private static browser: puppeteer.Browser | null = null;

  static async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  static async generateWorkoutImage(workoutName: string, exercises: any[]): Promise<Buffer> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Read the HTML template
      const templatePath = path.join(__dirname, 'templates', 'strava-share.html');
      let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

      // Process exercises to create description
      let description = '';
      if (exercises && exercises.length > 0) {
        description = exercises.map(exercise => {
          if (typeof exercise === 'string') {
            return exercise;
          } else if (exercise.name) {
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
      }

      // Truncate description if too long
      if (description.length > 150) {
        description = description.substring(0, 147) + '...';
      }

      // Replace placeholders
      htmlTemplate = htmlTemplate.replace('{{WORKOUT_NAME}}', workoutName || 'HybridX Workout');
      htmlTemplate = htmlTemplate.replace('{{WORKOUT_DESCRIPTION}}', description || 'HYROX Training Session');

      // Set page content
      await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

      // Set viewport to match the image dimensions
      await page.setViewport({ width: 1200, height: 630 });

      // Generate image
      const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1200, height: 630 }
      });

      return imageBuffer;
    } finally {
      await page.close();
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