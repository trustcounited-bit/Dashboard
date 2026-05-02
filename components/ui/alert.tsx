import { cn } from '@/lib/utils';
import { AlertTriangleIcon, CheckCircleIcon } from '@/components/icons';

type Tone = 'success' | 'error' | 'info' | 'warning';

const tones: Record<Tone, { bg: string; ring: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-800',
    icon: <CheckCircleIcon size={16} />,
  },
  error: {
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    text: 'text-rose-800',
    icon: <AlertTriangleIcon size={16} />,
  },
  info: {
    bg: 'bg-blue-50',
    ring: 'ring-blue-200',
    text: 'text-blue-800',
    icon: <CheckCircleIcon size={16} />,
  },
  warning: {
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-800',
    icon: <AlertTriangleIcon size={16} />,
  },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md p-3 text-sm ring-1 ring-inset',
        t.bg,
        t.ring,
        t.text,
        className
      )}
    >
      <span className="mt-0.5 shrink-0">{t.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}
