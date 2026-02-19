import { Directive, Input, HostListener } from '@angular/core';

@Directive({
  selector: '[appCopyToClipboard]',
  standalone: true
})
export class CopyToClipboardDirective {
  @Input('appCopyToClipboard') textToCopy: string = '';
  
  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.preventDefault();
    this.copyToClipboard(this.textToCopy);
  }
  
  private async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        this.fallbackCopy(text);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.fallbackCopy(text);
    }
  }
  
  private fallbackCopy(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (error) {
      console.error('Fallback copy failed:', error);
    }
    
    document.body.removeChild(textArea);
  }
}
