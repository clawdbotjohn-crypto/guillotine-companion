import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui';
import { RANKING_SOURCES, type WaiverRankingSource } from '../logic/rankingSources';
import { WAIVER_STRATEGY_REGISTRY, type StrategyKey } from '../logic/waiverStrategies';
import { applyCustomRankingFormula, getBuiltInStrategyValue, type CustomRanking, type CustomRankingConfig } from '../logic/customRankings';
import type { WaiverPlayerRow } from '../logic/waivers';

const fieldClass = 'min-h-11 w-full rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-sm text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]';
const labelClass = 'mb-1.5 block text-[10px] uppercase tracking-wider text-[#8b8eac]';

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-[#2a2e55] bg-[#11142b] p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-['Orbitron'] text-sm font-bold uppercase tracking-wider text-[#f0f0ff]">{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="min-h-11 min-w-11 rounded-lg text-[#8b8eac] hover:bg-[#1a1e3a] hover:text-white"><X className="mx-auto" size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function RankingFields({ config, onChange, rows }: { config: CustomRankingConfig; onChange: (config: CustomRankingConfig) => void; rows: readonly WaiverPlayerRow[] }) {
  const sample = rows[0];
  const sampleBase = sample ? getBuiltInStrategyValue(sample, config.baseStrategy) : 0;
  const preview = applyCustomRankingFormula(sampleBase, config.multiplier, config.modifier);
  return (
    <div className="space-y-4">
      <label><span className={labelClass}>Name</span><input className={fieldClass} value={config.name} maxLength={48} autoFocus onChange={(event) => onChange({ ...config, name: event.target.value })} /></label>
      <label><span className={labelClass}>Player values</span><select className={fieldClass} value={config.baseRankingSource} onChange={(event) => onChange({ ...config, baseRankingSource: event.target.value as WaiverRankingSource })}>{RANKING_SOURCES.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label>
      <label><span className={labelClass}>Base strategy</span><select className={fieldClass} value={config.baseStrategy} onChange={(event) => onChange({ ...config, baseStrategy: event.target.value as StrategyKey })}>{WAIVER_STRATEGY_REGISTRY.map((strategy) => <option key={strategy.key} value={strategy.key}>{strategy.label}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <label><span className={labelClass}>Multiplier</span><input aria-label="Multiplier" className={fieldClass} type="number" step="0.1" min="0" value={config.multiplier} onChange={(event) => onChange({ ...config, multiplier: Number(event.target.value) })} /></label>
        <label><span className={labelClass}>Additive modifier</span><input aria-label="Additive modifier" className={fieldClass} type="number" step="1" value={config.modifier} onChange={(event) => onChange({ ...config, modifier: Number(event.target.value) })} /></label>
      </div>
      <div className="rounded-xl border border-[#34386a] bg-[#0b0e20] p-3" aria-label="Formula preview">
        <div className="text-[10px] uppercase tracking-wider text-[#8b8eac]">Preview · $0 floor</div>
        <div className="mt-1 font-['Space_Mono'] text-xs text-[#c7d2fe]">max($0, ${config.multiplier} × base {config.modifier < 0 ? '−' : '+'} ${Math.abs(config.modifier)})</div>
        {sample && <div className="mt-2 text-xs text-[#8b8eac]">{sample.name}: ${sampleBase} → <strong className="text-[#10b981]">${preview}</strong></div>}
      </div>
    </div>
  );
}

export function NewCustomRankingDialog({ open, config, rows, atCap, existingNames, onConfigChange, onSourceChange, onCreate, onClose }: {
  open: boolean;
  config: CustomRankingConfig;
  rows: readonly WaiverPlayerRow[];
  atCap: boolean;
  existingNames: readonly string[];
  onConfigChange: (config: CustomRankingConfig) => void;
  onSourceChange: (source: WaiverRankingSource) => void;
  onCreate: (config: CustomRankingConfig) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const duplicate = existingNames.some((name) => name.trim().toLocaleLowerCase() === config.name.trim().toLocaleLowerCase());
  const valid = config.name.trim().length > 0 && !duplicate && Number.isFinite(config.multiplier) && config.multiplier >= 0 && Number.isFinite(config.modifier) && rows.length > 0 && !atCap;
  const change = (next: CustomRankingConfig) => {
    onConfigChange(next);
    if (next.baseRankingSource !== config.baseRankingSource) onSourceChange(next.baseRankingSource);
  };
  return <DialogFrame title="New custom ranking" onClose={onClose}>
    <RankingFields config={config} onChange={change} rows={rows} />
    {duplicate && <p className="mt-3 text-xs text-[#fbbf24]">Use a unique name in this league season.</p>}
    {atCap && <p className="mt-3 text-xs text-[#fbbf24]">Maximum 10 custom rankings. Delete one before creating another.</p>}
    {!atCap && rows.length === 0 && <p className="mt-3 text-xs text-[#fbbf24]">Loading the selected player values before the snapshot can be created.</p>}
    <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => onCreate(config)}>Create ranking</Button></div>
  </DialogFrame>;
}

export function CustomRankingSettingsDialog({ board, config, rows, onConfigChange, onSourceChange, onSave, onReset, onRecalculate, onDelete, onClose }: {
  board: CustomRanking | null;
  config: CustomRankingConfig | null;
  rows: readonly WaiverPlayerRow[];
  onConfigChange: (config: CustomRankingConfig) => void;
  onSourceChange: (source: WaiverRankingSource) => void;
  onSave: (config: CustomRankingConfig) => void;
  onReset: () => void;
  onRecalculate: (config: CustomRankingConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<'reset' | 'recalculate' | null>(null);
  useEffect(() => setConfirm(null), [board]);
  if (!board || !config) return null;
  const change = (next: CustomRankingConfig) => {
    onConfigChange(next);
    if (next.baseRankingSource !== config.baseRankingSource) onSourceChange(next.baseRankingSource);
  };
  const valid = config.name.trim().length > 0 && Number.isFinite(config.multiplier) && config.multiplier >= 0 && Number.isFinite(config.modifier);
  if (confirm) {
    const recalculating = confirm === 'recalculate';
    return <DialogFrame title={recalculating ? 'Confirm recalculation' : 'Confirm reset'} onClose={() => setConfirm(null)}>
      <div className="flex gap-3 rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] p-4 text-sm text-[#fbbf24]"><AlertTriangle className="shrink-0" size={20} /><p>{recalculating ? 'Recalculate replaces the frozen generated baseline with current source/strategy data and permanently removes every manual override.' : 'Reset permanently removes every manual override and returns all players to this ranking’s frozen generated baseline.'}</p></div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirm(null)}>Keep my values</Button><Button onClick={() => recalculating ? onRecalculate(config) : onReset()}>{recalculating ? 'Recalculate and clear' : 'Reset values'}</Button></div>
    </DialogFrame>;
  }
  return <DialogFrame title="Custom ranking settings" onClose={onClose}>
    <RankingFields config={config} onChange={change} rows={rows} />
    <p className="mt-3 text-[11px] leading-relaxed text-[#8b8eac]">Saving settings keeps the frozen generated values and all manual overrides. Only Recalculate applies the source/formula again.</p>
    <div className="mt-5 flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setConfirm('reset')}>Reset values</Button><Button variant="ghost" disabled={!valid || rows.length === 0} onClick={() => setConfirm('recalculate')}>Recalculate</Button><Button variant="ghost" onClick={onDelete}>Delete ranking</Button><span className="flex-1" /><Button disabled={!valid} onClick={() => onSave(config)}>Save settings</Button></div>
  </DialogFrame>;
}

export function ConfirmDeleteCustomRankingDialog({ board, onConfirm, onClose }: { board: CustomRanking | null; onConfirm: () => void; onClose: () => void }) {
  if (!board) return null;
  return <DialogFrame title="Delete custom ranking?" onClose={onClose}>
    <p className="text-sm text-[#d2d4ea]">Delete <strong>{board.name}</strong>? Its frozen values and manual overrides will be permanently removed.</p>
    <p className="mt-3 text-xs leading-relaxed text-[#8b8eac]">Built-in values, predicted winning bids, completed or losing bid history, source-relative rank, and Team Impact are not changed.</p>
    <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={onConfirm}>Delete ranking</Button></div>
  </DialogFrame>;
}
