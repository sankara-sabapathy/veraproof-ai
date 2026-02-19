import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: 'short' | 'medium' | 'long' = 'medium'): string {
    if (!value) {
      return '';
    }
    
    try {
      const date = typeof value === 'string' ? new Date(value) : value;
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      switch (format) {
        case 'short':
          return date.toLocaleDateString();
        case 'medium':
          return date.toLocaleString();
        case 'long':
          return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        default:
          return date.toLocaleString();
      }
    } catch (error) {
      return 'Invalid Date';
    }
  }
}
