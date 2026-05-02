import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'solid' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  solid:
    'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900 disabled:bg-slate-300',
  outline:
    'bg-white text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600 disabled:bg-rose-300',
};

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

const baseClass =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium shadow-sm transition disabled:cursor-not-allowed';

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = 'solid',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(baseClass, variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'solid',
  size = 'md',
  className,
  children,
  ...rest
}: CommonProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    'href'
  >) {
  return (
    <Link
      href={href}
      {...rest}
      className={cn(baseClass, variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  );
}
