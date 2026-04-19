/**
 * FDA Warning Letters Scraper
 * 
 * Scrapes FDA enforcement actions against supplement companies
 * - Public domain (government data)
 * - Zero legal exposure
 * - Adds immediate credibility to VSF scoring
 * 
 * Sources:
 * - Warning Letters: https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters
 * - Import Alerts: https://www.fda.gov/industry/actions-enforcements/import-alerts
 * 
 * Usage: Run quarterly to stay current
 */

import { BaseScraper, ScraperResult } from './base-scraper';
import { nsfRateLimiter } from './rate-limiter';
import * as cheerio from 'cheerio';

export interface FDAWarningLetter {
  company: string;
  issuedDate: string; // ISO date
  subject: string;
  violationType: string[]; // ["GMP Violation", "Unapproved Drug Claims", "Misbranding"]
  letterUrl: string;
  issuing_office?: string;
  products_mentioned?: string[];
}

export interface FDAImportAlert {
  alert_number: string;
  company: string;
  reason: string;
  issue_date: string;
  status: 'active' | 'closed';
  alert_url: string;
}

export class FDAWarningLettersScraper extends BaseScraper {
  protected serviceName = 'FDA Warning Letters';
  
  constructor() {
    super(nsfRateLimiter); // Use conservative rate limiting for government site
  }
  
  /**
   * Scrape warning letters for dietary supplements
   */
  async scrape(options: {
    startDate?: string; // ISO date, default: 1 year ago
    endDate?: string;   // ISO date, default: today
    industryFilter?: string; // "dietary supplements" | "food" | etc.
  } = {}): Promise<ScraperResult<FDAWarningLetter[]>> {
    this.log('Starting FDA warning letters scrape');
    
    const warnings: FDAWarningLetter[] = [];
    
    try {
      // FDA warning letters search page
      const baseUrl = 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters';
      
      // TODO: This is a placeholder - need to verify actual search endpoint
      // FDA may have a filterable search or we may need to scrape the listing page
      const searchUrl = this.buildSearchUrl(options);
      
      const response = await this.fetch(searchUrl);
      
      if (!response.ok) {
        return this.failure(`HTTP ${response.status}: ${response.statusText}`, 'FDA Warning Letters');
      }
      
      const html = await response.text();
      const parsed = this.parseWarningLetters(html);
      
      warnings.push(...parsed);
      
      this.log(`Found ${warnings.length} warning letters`);
      
      return this.success(warnings, 'FDA Warning Letters');
      
    } catch (error: any) {
      return this.failure(error.message, 'FDA Warning Letters Scrape');
    }
  }
  
  /**
   * Get warning letters specifically for a company/brand
   */
  async getWarningsForCompany(companyName: string): Promise<ScraperResult<FDAWarningLetter[]>> {
    this.log(`Searching FDA warnings for: ${companyName}`);
    
    try {
      // Search across all warnings
      const allWarnings = await this.scrape();
      
      if (!allWarnings.success || !allWarnings.data) {
        return this.failure('Failed to fetch warning letters', 'FDA Company Search');
      }
      
      // Filter by company name (fuzzy match)
      const companyWarnings = allWarnings.data.filter(warning => 
        warning.company.toLowerCase().includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(warning.company.toLowerCase())
      );
      
      this.log(`Found ${companyWarnings.length} warnings for ${companyName}`);
      
      return this.success(companyWarnings, `FDA Warnings: ${companyName}`);
      
    } catch (error: any) {
      return this.failure(error.message, 'FDA Company Search');
    }
  }
  
  /**
   * Scrape FDA Import Alerts (products detained at border)
   */
  async scrapeImportAlerts(): Promise<ScraperResult<FDAImportAlert[]>> {
    this.log('Starting FDA import alerts scrape');
    
    try {
      const url = 'https://www.fda.gov/industry/actions-enforcements/import-alerts';
      
      const response = await this.fetch(url);
      
      if (!response.ok) {
        return this.failure(`HTTP ${response.status}: ${response.statusText}`, 'FDA Import Alerts');
      }
      
      const html = await response.text();
      const alerts = this.parseImportAlerts(html);
      
      this.log(`Found ${alerts.length} import alerts`);
      
      return this.success(alerts, 'FDA Import Alerts');
      
    } catch (error: any) {
      return this.failure(error.message, 'FDA Import Alerts');
    }
  }
  
  /**
   * Build search URL with filters
   */
  private buildSearchUrl(options: {
    startDate?: string;
    endDate?: string;
    industryFilter?: string;
  }): string {
    // TODO: Verify actual FDA search URL structure
    // This is a placeholder - FDA may use different query params
    
    const baseUrl = 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters';
    
    const params = new URLSearchParams();
    
    if (options.startDate) {
      params.append('start_date', options.startDate);
    } else {
      // Default: 1 year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      params.append('start_date', oneYearAgo.toISOString().split('T')[0]);
    }
    
    if (options.endDate) {
      params.append('end_date', options.endDate);
    }
    
    if (options.industryFilter) {
      params.append('industry', options.industryFilter);
    } else {
      params.append('industry', 'dietary supplements');
    }
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  /**
   * Parse warning letters HTML
   */
  private parseWarningLetters(html: string): FDAWarningLetter[] {
    const $ = cheerio.load(html);
    const warnings: FDAWarningLetter[] = [];
    
    // TODO: Update selectors based on actual FDA HTML structure
    // This is a placeholder - need to inspect actual page structure
    
    $('.warning-letter-item, .view-row, tr').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        // Extract fields (adjust selectors based on actual HTML)
        const company = $elem.find('.company-name, .field-company, td:nth-child(1)').text().trim();
        const issuedDate = $elem.find('.issue-date, .field-date, td:nth-child(2)').text().trim();
        const subject = $elem.find('.subject, .field-subject, td:nth-child(3)').text().trim();
        const letterUrl = $elem.find('a').attr('href') || '';
        
        if (company && issuedDate) {
          // Classify violation types from subject
          const violationType: string[] = [];
          const subjectLower = subject.toLowerCase();
          
          if (subjectLower.includes('gmp') || subjectLower.includes('manufacturing')) {
            violationType.push('GMP Violation');
          }
          if (subjectLower.includes('drug') || subjectLower.includes('unapproved')) {
            violationType.push('Unapproved Drug Claims');
          }
          if (subjectLower.includes('misbrand') || subjectLower.includes('label')) {
            violationType.push('Misbranding');
          }
          if (subjectLower.includes('contamin') || subjectLower.includes('adulter')) {
            violationType.push('Contamination/Adulteration');
          }
          
          warnings.push({
            company,
            issuedDate: this.parseDate(issuedDate),
            subject,
            violationType: violationType.length > 0 ? violationType : ['Other'],
            letterUrl: letterUrl.startsWith('http') ? letterUrl : `https://www.fda.gov${letterUrl}`,
            issuing_office: 'FDA'
          });
        }
      } catch (error) {
        // Skip malformed entries
        console.error('Error parsing warning letter:', error);
      }
    });
    
    return warnings;
  }
  
  /**
   * Parse import alerts HTML
   */
  private parseImportAlerts(html: string): FDAImportAlert[] {
    const $ = cheerio.load(html);
    const alerts: FDAImportAlert[] = [];
    
    // TODO: Update selectors based on actual FDA HTML structure
    $('.alert-item, .view-row, tr').each((i, elem) => {
      try {
        const $elem = $(elem);
        
        const alert_number = $elem.find('.alert-number, td:nth-child(1)').text().trim();
        const company = $elem.find('.company, td:nth-child(2)').text().trim();
        const reason = $elem.find('.reason, td:nth-child(3)').text().trim();
        const issue_date = $elem.find('.date, td:nth-child(4)').text().trim();
        const alert_url = $elem.find('a').attr('href') || '';
        
        if (alert_number && company) {
          alerts.push({
            alert_number,
            company,
            reason,
            issue_date: this.parseDate(issue_date),
            status: 'active', // Default to active unless page shows otherwise
            alert_url: alert_url.startsWith('http') ? alert_url : `https://www.fda.gov${alert_url}`
          });
        }
      } catch (error) {
        console.error('Error parsing import alert:', error);
      }
    });
    
    return alerts;
  }
  
  /**
   * Parse various date formats FDA might use
   */
  private parseDate(dateStr: string): string {
    try {
      // Remove common prefixes
      const cleaned = dateStr.replace(/issued:|date:/i, '').trim();
      
      // Try to parse
      const date = new Date(cleaned);
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      return cleaned; // Return as-is if can't parse
    } catch (error) {
      return dateStr;
    }
  }
}

// Export singleton instance
export const fdaWarningLettersScraper = new FDAWarningLettersScraper();

/**
 * Sync FDA warnings to database
 */
export async function syncFDAWarningsToDatabase(supabase: any) {
  console.log('[FDA] Starting quarterly warning letters sync...');
  
  try {
    // Scrape warning letters
    const warningsResult = await fdaWarningLettersScraper.scrape();
    
    if (!warningsResult.success || !warningsResult.data) {
      console.error('[FDA] Failed to scrape warnings:', warningsResult.error);
      return { success: false, error: warningsResult.error };
    }
    
    const warnings = warningsResult.data;
    console.log(`[FDA] Found ${warnings.length} warning letters`);
    
    // Scrape import alerts
    const alertsResult = await fdaWarningLettersScraper.scrapeImportAlerts();
    const alerts = alertsResult.success ? alertsResult.data || [] : [];
    console.log(`[FDA] Found ${alerts.length} import alerts`);
    
    // Sync to database
    let syncedWarnings = 0;
    let syncedAlerts = 0;
    
    // Sync warning letters
    for (const warning of warnings) {
      try {
        // Find matching manufacturer
        const { data: manufacturer } = await supabase
          .from('manufacturers')
          .select('id')
          .ilike('name', `%${warning.company}%`)
          .single();
        
        if (manufacturer) {
          // Store as certification (type: 'fda_warning_letter')
          await supabase.from('certifications').upsert({
            manufacturer_id: manufacturer.id,
            type: 'fda_warning_letter',
            verified: true, // true = warning exists (BAD for score)
            verification_url: warning.letterUrl,
            issued_date: warning.issuedDate,
            verified_at: new Date().toISOString(),
            notes: `${warning.violationType.join(', ')}: ${warning.subject}`,
            acquisition_method: 'api_automated',
            data_source: 'fda_warning_letters'
          }, {
            onConflict: 'manufacturer_id,type,issued_date'
          });
          
          syncedWarnings++;
        }
      } catch (error: any) {
        console.error(`[FDA] Error syncing warning for ${warning.company}:`, error.message);
      }
    }
    
    // Sync import alerts
    for (const alert of alerts) {
      try {
        const { data: manufacturer } = await supabase
          .from('manufacturers')
          .select('id')
          .ilike('name', `%${alert.company}%`)
          .single();
        
        if (manufacturer) {
          await supabase.from('certifications').upsert({
            manufacturer_id: manufacturer.id,
            type: 'fda_import_alert',
            verified: true, // true = alert exists (BAD for score)
            verification_url: alert.alert_url,
            certificate_number: alert.alert_number,
            issued_date: alert.issue_date,
            verified_at: new Date().toISOString(),
            notes: alert.reason,
            acquisition_method: 'api_automated',
            data_source: 'fda_import_alerts'
          }, {
            onConflict: 'manufacturer_id,type,certificate_number'
          });
          
          syncedAlerts++;
        }
      } catch (error: any) {
        console.error(`[FDA] Error syncing alert for ${alert.company}:`, error.message);
      }
    }
    
    console.log(`[FDA] Sync complete: ${syncedWarnings} warnings, ${syncedAlerts} alerts`);
    
    return {
      success: true,
      warnings: syncedWarnings,
      alerts: syncedAlerts,
      total: syncedWarnings + syncedAlerts
    };
    
  } catch (error: any) {
    console.error('[FDA] Sync error:', error);
    return { success: false, error: error.message };
  }
}
