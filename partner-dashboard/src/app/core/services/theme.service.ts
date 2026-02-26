import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private currentTheme = signal<'light' | 'dark'>('light');
  
  /**
   * Get the current theme as a readonly signal
   */
  readonly theme = this.currentTheme.asReadonly();
  
  /**
   * Switch between light and dark themes
   * Dynamically loads the appropriate PrimeNG theme CSS file
   * @param theme - The theme to switch to ('light' or 'dark')
   */
  switchTheme(theme: 'light' | 'dark'): void {
    const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
    
    if (themeLink) {
      themeLink.href = `lara-${theme}-blue/theme.css`;
    } else {
      // Create the theme link element if it doesn't exist
      const newThemeLink = document.createElement('link');
      newThemeLink.id = 'app-theme';
      newThemeLink.rel = 'stylesheet';
      newThemeLink.href = `lara-${theme}-blue/theme.css`;
      document.head.appendChild(newThemeLink);
    }
    
    this.currentTheme.set(theme);
    localStorage.setItem('theme', theme);
    
    // Update data-theme attribute on document element for custom CSS variables
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  /**
   * Load the saved theme from localStorage
   * Called on app initialization to restore user's theme preference
   */
  loadTheme(): void {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    this.switchTheme(savedTheme);
  }
}
