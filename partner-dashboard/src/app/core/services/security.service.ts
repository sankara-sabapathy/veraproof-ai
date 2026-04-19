import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private csrfToken: string | null = null;

  constructor() {
    this.configureDOMPurify();
  }

  private configureDOMPurify(): void {
    DOMPurify.setConfig({
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true
    } as any);
  }

  sanitizeInput(input: string): string {
    if (!input) {
      return '';
    }
    const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
    return this.encodeSpecialCharacters(cleaned);
  }

  sanitizeHtml(html: string, allowedTags: string[] = []): string {
    if (!html) {
      return '';
    }
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
  }

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

  generateCsrfToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    this.csrfToken = token;
    return token;
  }

  getCsrfToken(): string | null {
    if (this.csrfToken) {
      return this.csrfToken;
    }
    if (typeof document === 'undefined') {
      return null;
    }
    const match = document.cookie.match(/(?:^|; )vp_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  setCsrfToken(token: string): void {
    this.csrfToken = token || null;
  }

  clearCsrfToken(): void {
    this.csrfToken = null;
  }

  enforceHttps(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isProduction && window.location.protocol !== 'https:') {
      console.error('HTTPS is required in production');
      window.location.href = window.location.href.replace('http://', 'https://');
      return false;
    }
    return true;
  }

  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
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

  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  sanitizeUrlParams(params: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        sanitized[key] = encodeURIComponent(this.sanitizeInput(params[key]));
      }
    }
    return sanitized;
  }
}
