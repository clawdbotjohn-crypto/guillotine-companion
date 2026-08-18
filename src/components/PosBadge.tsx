const POSITION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  QB: { bg: 'rgba(244,63,94,0.15)', border: '#f43f5e', text: '#f43f5e' },
  RB: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#6366f1' },
  WR: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981' },
  TE: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
  K:  { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', text: '#a855f7' },
  DEF:{ bg: 'rgba(100,116,139,0.15)', border: '#64748b', text: '#64748b' },
};

export default function PosBadge({ pos }: { pos: string }) {
  const colors = POSITION_COLORS[pos] || POSITION_COLORS.DEF;
  return (
    <span
      className="pos-badge"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {pos}
    </span>
  );
}
