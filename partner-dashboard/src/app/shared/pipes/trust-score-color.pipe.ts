import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'trustScoreColor',
  standalone: true
})
export class TrustScoreColorPipe implements PipeTransform {
  transform(score: number | null | undefined): string {
    if (score === null || score === undefined) {
      return 'gray';
    }
    
    if (score > 80) {
      return 'green';
    } else if (score >= 50) {
      return 'yellow';
    } else {
      return 'red';
    }
  }
}
