import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { OutcomeDistribution } from '../../../core/models/interfaces';

@Component({
  selector: 'app-outcome-chart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './outcome-chart.component.html',
  styleUrls: ['./outcome-chart.component.scss']
})
export class OutcomeChartComponent implements OnChanges, AfterViewInit {
  @Input() data: OutcomeDistribution | null = null;
  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart: any;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chartCanvas) {
      this.renderChart();
    }
  }

  /**
   * Render the outcome distribution pie chart
   */
  private renderChart(): void {
    if (!this.chartCanvas || !this.data) {
      return;
    }

    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 300;
    }

    // Prepare data
    const outcomes = [
      { label: 'Success', value: this.data.success, color: '#4caf50' },
      { label: 'Failed', value: this.data.failed, color: '#f44336' },
      { label: 'Timeout', value: this.data.timeout, color: '#ff9800' },
      { label: 'Cancelled', value: this.data.cancelled, color: '#9e9e9e' }
    ];

    const total = outcomes.reduce((sum, outcome) => sum + outcome.value, 0);

    if (total === 0) {
      return;
    }

    // Calculate center and radius
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 20;
    const radius = Math.min(centerX, centerY) - 40;

    // Draw pie slices
    let currentAngle = -Math.PI / 2; // Start at top

    outcomes.forEach(outcome => {
      const sliceAngle = (outcome.value / total) * 2 * Math.PI;

      // Draw slice
      ctx.fillStyle = outcome.color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw percentage label on slice if significant
      const percentage = (outcome.value / total) * 100;
      if (percentage > 5) {
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${percentage.toFixed(1)}%`, labelX, labelY);
      }

      currentAngle += sliceAngle;
    });
  }

  /**
   * Get outcome statistics
   */
  get outcomeStats(): Array<{ label: string; value: number; percentage: number; color: string }> {
    if (!this.data) {
      return [];
    }

    const outcomes = [
      { label: 'Success', value: this.data.success, color: '#4caf50' },
      { label: 'Failed', value: this.data.failed, color: '#f44336' },
      { label: 'Timeout', value: this.data.timeout, color: '#ff9800' },
      { label: 'Cancelled', value: this.data.cancelled, color: '#9e9e9e' }
    ];

    const total = outcomes.reduce((sum, outcome) => sum + outcome.value, 0);

    return outcomes.map(outcome => ({
      ...outcome,
      percentage: total > 0 ? (outcome.value / total) * 100 : 0
    }));
  }

  /**
   * Get total count
   */
  get totalCount(): number {
    if (!this.data) {
      return 0;
    }
    return this.data.success + this.data.failed + this.data.timeout + this.data.cancelled;
  }
}
