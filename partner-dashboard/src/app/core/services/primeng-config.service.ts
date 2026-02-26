import { Injectable, inject } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';

/**
 * Service to configure global PrimeNG settings
 * Configures ripple effects, z-index values, and translations
 */
@Injectable({
  providedIn: 'root'
})
export class PrimeNGConfigService {
  private config = inject(PrimeNGConfig);

  /**
   * Initialize PrimeNG configuration with VeraProof AI defaults
   */
  initializeConfig(): void {
    // Enable ripple effect for interactive elements
    this.config.ripple = true;

    // Configure z-index values for overlays
    this.config.zIndex = {
      modal: 1100,        // Dialogs and modals
      overlay: 1000,      // Dropdown panels, menus
      menu: 1000,         // Context menus
      tooltip: 1100,      // Tooltips
      toast: 1200         // Toast notifications (highest priority)
    };

    // Configure default translations (English)
    this.config.setTranslation({
      startsWith: 'Starts with',
      contains: 'Contains',
      notContains: 'Not contains',
      endsWith: 'Ends with',
      equals: 'Equals',
      notEquals: 'Not equals',
      noFilter: 'No Filter',
      lt: 'Less than',
      lte: 'Less than or equal to',
      gt: 'Greater than',
      gte: 'Greater than or equal to',
      is: 'Is',
      isNot: 'Is not',
      before: 'Before',
      after: 'After',
      dateIs: 'Date is',
      dateIsNot: 'Date is not',
      dateBefore: 'Date is before',
      dateAfter: 'Date is after',
      clear: 'Clear',
      apply: 'Apply',
      matchAll: 'Match All',
      matchAny: 'Match Any',
      addRule: 'Add Rule',
      removeRule: 'Remove Rule',
      accept: 'Yes',
      reject: 'No',
      choose: 'Choose',
      upload: 'Upload',
      cancel: 'Cancel',
      dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      today: 'Today',
      weekHeader: 'Wk',
      weak: 'Weak',
      medium: 'Medium',
      strong: 'Strong',
      passwordPrompt: 'Enter a password',
      emptyMessage: 'No results found',
      emptyFilterMessage: 'No results found'
    });
  }

  /**
   * Enable or disable ripple effect globally
   * @param enabled Whether to enable ripple effect
   */
  setRipple(enabled: boolean): void {
    this.config.ripple = enabled;
  }

  /**
   * Get current ripple effect setting
   * @returns Current ripple effect state
   */
  getRipple(): boolean {
    return this.config.ripple;
  }
}
