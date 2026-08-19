import type { ReactNode, ButtonHTMLAttributes } from 'react';

// Card component — Neon League style
interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = true, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[rgba(14,16,37,0.8)] border border-[#2a2e55] rounded-xl
        backdrop-blur-[12px]
        transition-[border-color,box-shadow] duration-200
        ${hover ? 'hover:border-[#6366f1] hover:shadow-[0_4px_20px_rgba(99,102,241,0.15)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Position badge
const POS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  QB: { bg: 'rgba(244,63,94,0.15)', border: '#f43f5e', text: '#f43f5e' },
  RB: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#6366f1' },
  WR: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981' },
  TE: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
  K: { bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' },
  DEF: { bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' },
  DL: { bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' },
  LB: { bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' },
  DB: { bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' },
};

const DEFAULT_POS = { bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' };

interface BadgeProps {
  position: string;
  className?: string;
}

export function PositionBadge({ position, className = '' }: BadgeProps) {
  const c = POS_COLORS[position] || DEFAULT_POS;
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full
        text-[10px] font-bold font-['Exo_2'] uppercase tracking-wide border ${className}`}
      style={{ background: c.bg, borderColor: c.border, color: c.text }}
    >
      {position}
    </span>
  );
}

// Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const base = 'font-["Orbitron"] font-bold uppercase tracking-wider transition-all duration-200 rounded-xl disabled:opacity-40';
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };
  const variants = {
    primary: 'text-white bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] hover:-translate-y-px',
    ghost: 'text-[#a5b4fc] bg-transparent border border-[#2a2e55] hover:border-[#6366f1] hover:text-[#f0f0ff]',
    danger: 'text-white bg-gradient-to-r from-[#f43f5e] to-[#e11d48] shadow-[0_4px_15px_rgba(244,63,94,0.3)]',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Stat card
interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentColor?: string;
}

export function StatCard({ label, value, subtext, accentColor = '#6366f1' }: StatCardProps) {
  return (
    <Card hover={false} className="p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99] font-['Exo_2'] mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold font-['Space_Mono'] tabular-nums" style={{ color: accentColor }}>
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-[#4a4d77] mt-1">{subtext}</div>
      )}
    </Card>
  );
}

// Loading skeleton
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 3 }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-[#161a3a] animate-pulse"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

// Table wrapper with monospace numbers
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

// Status badge
interface StatusBadgeProps {
  status: 'safe' | 'middle' | 'at-risk' | 'eliminated' | 'champion' | 'runner-up';
  className?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  safe: { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Safe' },
  middle: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', label: 'Middle' },
  'at-risk': { bg: 'rgba(244,63,94,0.15)', text: '#f43f5e', label: 'At Risk' },
  eliminated: { bg: 'rgba(244,63,94,0.2)', text: '#f43f5e', label: 'Eliminated' },
  champion: { bg: 'rgba(99,102,241,0.2)', text: '#8b5cf6', label: 'Champion' },
  'runner-up': { bg: 'rgba(168,85,247,0.15)', text: '#a855f7', label: 'Runner-Up' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.middle;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${className}`}
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
