import { TenantEnvironmentSlug, TenantEnvironmentSummary } from '../../core/models/interfaces';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
  detail?: string;
}

export interface UsagePresentation {
  currentUsage: number;
  monthlyQuota: number;
  usagePercentage: number;
  remainingQuota: number;
  environmentLabel: string;
  cycleStart: string | null;
  cycleEnd: string | null;
}

const STATUS_PRESENTATIONS: Record<string, StatusPresentation> = {
  idle: {
    label: 'Awaiting Capture',
    tone: 'warning',
    detail: 'The verification session is ready but has not started capture yet.'
  },
  baseline: {
    label: 'Baseline Capture',
    tone: 'info',
    detail: 'The session is collecting the initial baseline reference.'
  },
  pan: {
    label: 'Motion Check',
    tone: 'info',
    detail: 'The user is completing a guided motion challenge.'
  },
  return: {
    label: 'Return Motion',
    tone: 'info',
    detail: 'The user is returning to the neutral position.'
  },
  analyzing: {
    label: 'Analyzing',
    tone: 'info',
    detail: 'Evidence has been captured and the system is scoring the session.'
  },
  active: {
    label: 'Active',
    tone: 'info'
  },
  complete: {
    label: 'Completed',
    tone: 'success'
  },
  completed: {
    label: 'Completed',
    tone: 'success'
  },
  success: {
    label: 'Successful',
    tone: 'success'
  },
  sandbox: {
    label: 'Sandbox',
    tone: 'warning'
  },
  production: {
    label: 'Production',
    tone: 'success'
  },
  pending: {
    label: 'Pending',
    tone: 'warning'
  },
  revoked: {
    label: 'Revoked',
    tone: 'danger'
  },
  failed: {
    label: 'Failed',
    tone: 'danger'
  },
  error: {
    label: 'Error',
    tone: 'danger'
  }
};

export function formatEnvironmentLabel(value?: TenantEnvironmentSlug | string | null): string {
  if (!value) {
    return 'Current Environment';
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'sandbox') {
    return 'Sandbox';
  }
  if (normalized === 'production') {
    return 'Production';
  }

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getStatusPresentation(value?: string | null): StatusPresentation {
  if (!value) {
    return {
      label: 'Unknown',
      tone: 'neutral',
      detail: 'No status has been recorded yet.'
    };
  }

  const normalized = String(value).trim().toLowerCase();
  if (STATUS_PRESENTATIONS[normalized]) {
    return STATUS_PRESENTATIONS[normalized];
  }

  const commandMatch = normalized.match(/^cmd[_-]?(\d+)$/);
  if (commandMatch) {
    const commandIndex = Number(commandMatch[1]) + 1;
    return {
      label: `Custom Step ${commandIndex}`,
      tone: 'info',
      detail: 'The session is executing a custom verification step.'
    };
  }

  return {
    label: normalized
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    tone: 'neutral'
  };
}

export function getUsagePresentation(
  quota: { current_usage?: number | null; monthly_quota?: number | null; usage_percentage?: number | null } | null | undefined,
  activeEnvironment?: TenantEnvironmentSummary | null
): UsagePresentation {
  const environmentCurrentUsage = Number(activeEnvironment?.current_usage ?? 0);
  const environmentMonthlyQuota = Number(activeEnvironment?.monthly_quota ?? 0);

  const currentUsage = environmentCurrentUsage > 0 || environmentMonthlyQuota > 0
    ? environmentCurrentUsage
    : Number(quota?.current_usage ?? 0);

  const monthlyQuota = environmentMonthlyQuota > 0
    ? environmentMonthlyQuota
    : Number(quota?.monthly_quota ?? 0);

  const safeMonthlyQuota = monthlyQuota > 0 ? monthlyQuota : 0;
  const fallbackUsagePercentage = safeMonthlyQuota > 0
    ? (currentUsage / safeMonthlyQuota) * 100
    : 0;
  const explicitUsagePercentage = Number(quota?.usage_percentage ?? fallbackUsagePercentage);
  const usagePercentage = Math.max(0, Math.min(100, Number.isFinite(explicitUsagePercentage) ? explicitUsagePercentage : fallbackUsagePercentage));

  return {
    currentUsage,
    monthlyQuota: safeMonthlyQuota,
    usagePercentage,
    remainingQuota: Math.max(0, safeMonthlyQuota - currentUsage),
    environmentLabel: formatEnvironmentLabel(activeEnvironment?.slug),
    cycleStart: activeEnvironment?.billing_cycle_start ?? null,
    cycleEnd: activeEnvironment?.billing_cycle_end ?? null
  };
}

export function formatTrustScore(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Not available';
  }

  return Number(value).toFixed(1);
}

export function getTrustScoreTone(value?: number | null): StatusTone {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'neutral';
  }

  if (value >= 80) {
    return 'success';
  }

  if (value >= 50) {
    return 'warning';
  }

  return 'danger';
}
