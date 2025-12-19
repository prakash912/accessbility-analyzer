import pa11y from 'pa11y';
import puppeteer from 'puppeteer';
import {
  AccessibilityAnalysisRequest,
  AccessibilityAnalysisResponse,
  Pa11yIssue,
} from '../types/accessibility';

// Configure Puppeteer cache directory for Render
if (process.env.PUPPETEER_CACHE_DIR) {
  process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR;
} else if (process.env.HOME) {
  // Use HOME directory for cache (Render sets this)
  process.env.PUPPETEER_CACHE_DIR = require('path').join(process.env.HOME, '.cache', 'puppeteer');
} else {
  // Fallback to Render's default
  process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
}

export class AccessibilityService {
  /**
   * Get Chrome executable path from Puppeteer
   * Handles Render and other deployment environments
   * Only returns a path if Chrome actually exists at that location
   */
  private static getChromeExecutablePath(): string | undefined {
    const fs = require('fs');
    const path = require('path');
    
    // Helper to verify file exists and is executable
    const verifyChromePath = (chromePath: string): boolean => {
      try {
        if (!fs.existsSync(chromePath)) {
          return false;
        }
        // Check if it's a file (not a directory)
        const stats = fs.statSync(chromePath);
        if (!stats.isFile()) {
          return false;
        }
        // Try to access it (check if executable)
        fs.accessSync(chromePath, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    };
    
    // Try to get Puppeteer's Chrome path - but verify it exists
    try {
      const puppeteerPath = puppeteer.executablePath();
      
      if (puppeteerPath && verifyChromePath(puppeteerPath)) {
        console.log('✅ Using Puppeteer Chrome at:', puppeteerPath);
        return puppeteerPath;
      } else if (puppeteerPath) {
        console.warn('⚠️ Puppeteer Chrome path does not exist or is not accessible:', puppeteerPath);
        console.warn('⚠️ Will let Puppeteer handle Chrome discovery automatically');
      }
    } catch (error) {
      console.warn('⚠️ Could not get Puppeteer Chrome path:', error);
    }

    // Try to find Chrome in Puppeteer cache directory
    try {
      const possibleCacheDirs = [
        process.env.PUPPETEER_CACHE_DIR,
        path.join(process.env.HOME || '/opt/render', '.cache', 'puppeteer', 'chrome'),
        path.join(process.cwd(), '.cache', 'puppeteer', 'chrome'),
        '/opt/render/.cache/puppeteer/chrome',
      ].filter(Boolean) as string[];
      
      for (const cacheDir of possibleCacheDirs) {
        if (!fs.existsSync(cacheDir)) {
          continue;
        }
        
        // Look for chrome executable in cache directory
        const findChrome = (dir: string, depth = 0): string | null => {
          // Limit recursion depth to avoid infinite loops
          if (depth > 5) return null;
          
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              
              if (entry.isDirectory()) {
                const found = findChrome(fullPath, depth + 1);
                if (found) return found;
              } else if (entry.name === 'chrome' || entry.name === 'chromium') {
                if (verifyChromePath(fullPath)) {
                  return fullPath;
                }
              }
            }
          } catch {
            // Continue to next directory
          }
          return null;
        };
        
        const chromePath = findChrome(cacheDir);
        if (chromePath) {
          console.log('✅ Found Chrome in cache at:', chromePath);
          return chromePath;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not search Puppeteer cache:', error);
    }

    // Try system Chrome locations (for environments with system Chrome installed)
    const systemPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];

    for (const systemPath of systemPaths) {
      if (verifyChromePath(systemPath)) {
        console.log('✅ Found system Chrome at:', systemPath);
        return systemPath;
      }
    }

    // Don't set executablePath - let Puppeteer/Pa11y handle Chrome discovery automatically
    console.log('ℹ️ Chrome executable path not found. Puppeteer will handle Chrome discovery automatically.');
    return undefined;
  }

  /**
   * Analyze a URL for accessibility issues using Pa11y
   */
  static async analyzeUrl(
    request: AccessibilityAnalysisRequest
  ): Promise<AccessibilityAnalysisResponse> {
    try {
      // Validate URL
      const url = new URL(request.url);

      // Get Chrome executable path (only if it actually exists)
      const chromeExecutablePath = this.getChromeExecutablePath();

      // Build chrome launch config
      const chromeLaunchConfig: any = {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--single-process', // Important for Render's limited resources
        ],
        ignoreHTTPSErrors: true,
      };

      // Only set executablePath if we have a verified, existing path
      // If not set, Puppeteer/Pa11y will handle Chrome discovery automatically
      if (chromeExecutablePath) {
        const fs = require('fs');
        // Double-check the path exists before using it
        if (fs.existsSync(chromeExecutablePath)) {
          chromeLaunchConfig.executablePath = chromeExecutablePath;
          console.log('✅ Using Chrome at:', chromeExecutablePath);
        } else {
          console.warn('⚠️ Chrome path was provided but does not exist:', chromeExecutablePath);
          console.warn('⚠️ Letting Puppeteer handle Chrome discovery');
          // Don't set executablePath - let Puppeteer find Chrome automatically
        }
      } else {
        console.log('ℹ️ No Chrome path specified - Puppeteer will discover Chrome automatically');
      }

      // Configure Pa11y options
      // Note: includeWarnings is set to true by default to ensure color contrast
      // and other important accessibility warnings are included in the results
      const pa11yOptions = {
        standard: request.standard || 'WCAG2AA',
        includeWarnings: request.includeWarnings ?? true,
        includeNotices: request.includeNotices ?? true,
        actions: request.actions || [],
        wait: request.wait || 0,
        timeout: request.timeout || 30000,
        hideElements: request.hideElements || '',
        chromeLaunchConfig,
        log: {
          debug: console.log,
          error: console.error,
          info: console.log,
        },
      };

      // Run Pa11y analysis
      const results = await pa11y(url.toString(), pa11yOptions);

      // Process and format results
      const issues: Pa11yIssue[] = results.issues.map(issue => ({
        code: issue.code,
        context: issue.context,
        message: issue.message,
        selector: issue.selector,
        type: issue.type as 'error' | 'warning' | 'notice',
      }));

      // Calculate standards summary
      const errorCount = issues.filter(issue => issue.type === 'error').length;
      const warningCount = issues.filter(
        issue => issue.type === 'warning'
      ).length;
      const noticeCount = issues.filter(
        issue => issue.type === 'notice'
      ).length;

      const standards = {
        [pa11yOptions.standard]: {
          errors: errorCount,
          warnings: warningCount,
          notices: noticeCount,
        },
      };

      // Calculate AIM (Accessibility Impact Metric) Score
      // Score starts at 10 and deducts points based on issue severity
      // Errors: -0.4 points each (most critical)
      // Warnings: -0.15 points each (moderate impact)
      // Notices: -0.05 points each (minor impact)
      // Minimum score is 0, maximum is 10
      const aimScore = Math.max(
        0,
        Math.min(
          10,
          10 - errorCount * 0.4 - warningCount * 0.15 - noticeCount * 0.05
        )
      );

      // Round to 1 decimal place
      const roundedAimScore = Math.round(aimScore * 10) / 10;

      return {
        documentTitle: results.documentTitle,
        pageUrl: results.pageUrl,
        issues,
        standards,
        aimScore: roundedAimScore,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Accessibility analysis error:', error);
      throw new Error(
        `Failed to analyze accessibility: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate accessibility analysis request
   */
  static validateRequest(request: any): AccessibilityAnalysisRequest {
    if (!request.url) {
      throw new Error('URL is required');
    }

    try {
      new URL(request.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    return {
      url: request.url,
      standard: request.standard,
      includeWarnings: request.includeWarnings,
      includeNotices: request.includeNotices,
      actions: request.actions,
      wait: request.wait,
      timeout: request.timeout,
      hideElements: request.hideElements,
      chromeLaunchConfig: request.chromeLaunchConfig,
    };
  }
}
