import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

/**
 * Security service for input sanitization, XSS prevention, and CSRF token management
 */
@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private csrfToken: string | null = null;

  constructor() {
    // Configure DOMPurify
    this.configureDOMPurify();
  }

  /**
   * Configure DOMPurify with secure defaults
   */
  private configureDOMPurify(): void {
    DOMPurify.setConfig({
      ALLOWED_TAGS: [], // Strip all HTML tags by default
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Keep text content
      SANITIZE_DOM: true
    } as any);
  }

  /**
   * Sanitize user input to prevent XSS attacks
   * Strips HTML tags and encodes special characters
   */
  sanitizeInput(input: string): string {
    if (!input) {
      return '';
    }

    // Use DOMPurify to strip HTML tags
    const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
    
    // Encode special characters
    return this.encodeSpecialCharacters(cleaned);
  }

  /**
   * Sanitize HTML content with allowed tags (for rich text)
   */
  sanitizeHtml(html: string, allowedTags: string[] = []): string {
    if (!html) {
      return '';
    }

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  }

  /**
   * Encode special characters to prevent XSS
   */
  private encodeSpecialCharacters(input: string): string {
    const map: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return input.replace(/[<>&"'\/]/g, (char) => map[char] || char);
  }

  /**
   * Generate CSRF token
   */
  generateCsrfToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    this.csrfToken = token;
    return token;
  }

  /**
   * Get current CSRF token
   */
  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Set CSRF token (from server response)
   */
  setCsrfToken(token: string): void {
    this.csrfToken = token;
  }

  /**
   * Clear CSRF token
   */
  clearCsrfToken(): void {
    this.csrfToken = null;
  }

  /**
   * Validate that the application is running over HTTPS in production
   */
  enforceHttps(): boolean {
    if (typeof window === 'undefined') {
      return true; // SSR context
    }

    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    if (isProduction && window.location.protocol !== 'https:') {
      console.error('HTTPS is required in production');
      // Redirect to HTTPS
      window.location.href = window.location.href.replace('http://', 'https://');
      return false;
    }

    return true;
  }

  /**
   * Sanitize object properties recursively
   */
  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeInput(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          sanitized[key] = this.sanitizeObject(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((item: any) => 
            typeof item === 'string' ? this.sanitizeInput(item) :
            typeof item === 'object' && item !== null ? this.sanitizeObject(item) :
            item
          );
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized as T;
  }

  /**
   * Validate URL to prevent open redirect vulnerabilities
   */
  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Sanitize URL parameters
   */
  sanitizeUrlParams(params: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        sanitized[key] = encodeURIComponent(this.sanitizeInput(params[key]));
      }
    }

    return sanitized;
  }
}
