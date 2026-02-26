import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { UsageTrendData } from '../../../core/models/interfaces';

@Component({
  selector: 'app-usage-chart',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './usage-chart.component.html',
  styleUrls: ['./usage-chart.component.scss']
})
export class UsageChartComponent implements OnChanges, AfterViewInit {
  @Input() data: UsageTrendData[] = [];
  @Input() period: 'daily' | 'weekly' | 'monthly' = 'daily';
  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef<HTMLCanvasElement>;

  private chart: any;

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['period']) && this.chartCanvas) {
      this.renderChart();
    }
  }

  /**
   * Render the usage trend chart
   */
  private renderChart(): void {
    if (!this.chartCanvas || !this.data || this.data.length === 0) {
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
    const labels = this.data.map(d => this.formatDate(d.date));
    const sessionCounts = this.data.map(d => d.session_count);
    const successCounts = this.data.map(d => d.success_count);
    const failedCounts = this.data.map(d => d.failed_count);

    // Calculate chart dimensions
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    // Find max value for scaling
    const maxValue = Math.max(...sessionCounts, 1);
    const yScale = chartHeight / maxValue;
    const xScale = chartWidth / (this.data.length - 1 || 1);

    // Draw axes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, canvas.height - padding.bottom);
    ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(canvas.width - padding.right, y);
      ctx.stroke();
    }

    // Draw y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = Math.round(maxValue - (maxValue / 5) * i);
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(value.toString(), padding.left - 10, y + 4);
    }

    // Draw lines
    this.drawLine(ctx, sessionCounts, xScale, yScale, padding, '#3f51b5', 'Total Sessions');
    this.drawLine(ctx, successCounts, xScale, yScale, padding, '#4caf50', 'Success');
    this.drawLine(ctx, failedCounts, xScale, yScale, padding, '#f44336', 'Failed');

    // Draw x-axis labels (show every nth label to avoid crowding)
    ctx.fillStyle = '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const labelStep = Math.ceil(labels.length / 8);
    labels.forEach((label, i) => {
      if (i % labelStep === 0 || i === labels.length - 1) {
        const x = padding.left + i * xScale;
        ctx.fillText(label, x, canvas.height - padding.bottom + 20);
      }
    });
  }

  /**
   * Draw a line on the chart
   */
  private drawLine(
    ctx: CanvasRenderingContext2D,
    data: number[],
    xScale: number,
    yScale: number,
    padding: { top: number; left: number; bottom: number; right: number },
    color: string,
    label: string
  ): void {
    const chartHeight = ctx.canvas.height - padding.top - padding.bottom;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + chartHeight - value * yScale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = color;
    data.forEach((value, i) => {
      const x = padding.left + i * xScale;
      const y = padding.top + chartHeight - value * yScale;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  /**
   * Format date based on period
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    switch (this.period) {
      case 'daily':
        return `${date.getMonth() + 1}/${date.getDate()}`;
      case 'weekly':
        return `${date.getMonth() + 1}/${date.getDate()}`;
      case 'monthly':
        return `${date.getMonth() + 1}/${date.getFullYear()}`;
      default:
        return dateStr;
    }
  }

  /**
   * Get period label
   */
  get periodLabel(): string {
    switch (this.period) {
      case 'daily':
        return 'Daily Usage Trend';
      case 'weekly':
        return 'Weekly Usage Trend';
      case 'monthly':
        return 'Monthly Usage Trend';
      default:
        return 'Usage Trend';
    }
  }
}
