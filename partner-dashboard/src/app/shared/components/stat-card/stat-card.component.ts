import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, CardModule, ProgressSpinnerModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss']
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number | null = '';
  @Input() subtitle?: string;
  @Input() icon: string = '';
  @Input() iconColor: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() trend?: number;
  @Input() loading: boolean = false;
}
