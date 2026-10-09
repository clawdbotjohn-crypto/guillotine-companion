import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui';
import { RANKING_SOURCES, type WaiverRankingSource } from '../logic/rankingSources';
import { WAIVER_STRATEGY_REGISTRY, type StrategyKey } from '../logic/waiverStrategies';
import {
  CUSTOM_RANKING_POSITIONS,
  applyCustomRankingFormula,
  applyPositionValueCurve,
  customRankingGeneratedSettingsChanged,
  getBuiltInStrategyValue,
  type CustomRanking,
  type CustomRankingConfig,
  type CustomRankingPosition,
} from '../logic/customRankings';
import type { WaiverPlayerRow } from '../logic/waivers';

const fieldClass = 'min-h-11 w-full rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-sm text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]';
const labelClass = 'mb-1.5 block text-[10px] uppercase tracking-wider text-[#8b8eac]';

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    (dialog?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? focusable()[0])?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!dialog?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [title]);
  return (
    <div data-testid="custom-ranking-dialog-backdrop" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="presentation">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-[#2a2e55] bg-[#11142b] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[92vh] sm:pb-5">
        <header className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-['Orbitron'] text-sm font-bold uppercase tracking-wider text-[#f0f0ff]">{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="min-h-11 min-w-11 rounded-lg text-[#8b8eac] hover:bg-[#1a1e3a] hover:text-white"><X className="mx-auto" size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function NumericField({
  label,
  value,
  onValueChange,
  allowNegative = false,
  fallback = 0,
  step = '1',
}: {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  allowNegative?: boolean;
  fallback?: number;
  step?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  const skipNextBlurCommit = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    focused.current = false;
    if (skipNextBlurCommit.current) {
      skipNextBlurCommit.current = false;
      setDraft(String(value));
      return;
    }
    const parsed = draft === '' || draft === '-' ? fallback : Number(draft);
    const next = Number.isFinite(parsed) ? (allowNegative ? parsed : Math.max(0, parsed)) : fallback;
    setDraft(String(next));
    onValueChange(next);
  };

  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        aria-label={label}
        className={fieldClass}
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        pattern={allowNegative ? '-?[0-9]*[.]?[0-9]*' : '[0-9]*[.]?[0-9]*'}
        value={draft}
        onFocus={(event) => {
          focused.current = true;
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          const validDraft = allowNegative
            ? /^-?\d*(?:\.\d*)?$/.test(nextDraft)
            : /^\d*(?:\.\d*)?$/.test(nextDraft);
          if (validDraft) setDraft(nextDraft);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            skipNextBlurCommit.current = true;
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
        step={step}
      />
    </label>
  );
}

function modeIsValid(config: CustomRankingConfig): boolean {
  if (!Number.isFinite(config.multiplier) || config.multiplier < 0) return false;
  if (config.mode === 'built-in') return Number.isFinite(config.modifier);
  return CUSTOM_RANKING_POSITIONS.every((position) => {
    const curve = config.positionCurves[position];
    return Number.isFinite(curve.maxValue) && curve.maxValue >= 0
      && Number.isFinite(curve.step) && curve.step >= 0;
  });
}

function RankingFields({
  config,
  onChange,
  rows,
  sourceChanged = false,
}: {
  config: CustomRankingConfig;
  onChange: (config: CustomRankingConfig) => void;
  rows: readonly WaiverPlayerRow[];
  sourceChanged?: boolean;
}) {
  const sample = rows[0];
  const sampleBase = sample ? getBuiltInStrategyValue(sample, config.baseStrategy) : 0;
  const samplePosition = sample && CUSTOM_RANKING_POSITIONS.includes(sample.position as CustomRankingPosition)
    ? sample.position as CustomRankingPosition
    : null;
  const preview = sample
    ? config.mode === 'built-in'
      ? applyCustomRankingFormula(sampleBase, config.multiplier, config.modifier)
      : samplePosition
        ? applyPositionValueCurve(sample.posRank, config.positionCurves[samplePosition], config.multiplier)
        : 0
    : 0;
  return (
    <div className="space-y-5">
      <label><span className={labelClass}>Name</span><input className={fieldClass} value={config.name} maxLength={48} data-dialog-initial-focus onChange={(event) => onChange({ ...config, name: event.target.value })} /></label>
      <label><span className={labelClass}>Player values</span><select className={fieldClass} value={config.baseRankingSource} onChange={(event) => onChange({ ...config, baseRankingSource: event.target.value as WaiverRankingSource })}>{RANKING_SOURCES.map((source) => <option key={source.key} value={source.key}>{source.label}</option>)}</select></label>
      {sourceChanged && <p role="alert" className="rounded-lg border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] p-3 text-xs leading-relaxed text-[#fbbf24]">Warning: Changing ranking source will reset player values. But you can choose to preserve edited player values on save.</p>}

      <fieldset>
        <legend className={labelClass}>Build values from</legend>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0b0e20] p-1">
          <button type="button" aria-pressed={config.mode === 'built-in'} onClick={() => onChange({ ...config, mode: 'built-in' })} className={`min-h-11 rounded-lg px-2 text-xs font-semibold ${config.mode === 'built-in' ? 'bg-[#34386a] text-white' : 'text-[#8b8eac]'}`}>Built-in ranking system</button>
          <button type="button" aria-pressed={config.mode === 'position-curve'} onClick={() => onChange({ ...config, mode: 'position-curve' })} className={`min-h-11 rounded-lg px-2 text-xs font-semibold ${config.mode === 'position-curve' ? 'bg-[#34386a] text-white' : 'text-[#8b8eac]'}`}>Position-based value curve</button>
        </div>
      </fieldset>

      {config.mode === 'built-in' ? <>
        <label><span className={labelClass}>Base strategy</span><select className={fieldClass} value={config.baseStrategy} onChange={(event) => onChange({ ...config, baseStrategy: event.target.value as StrategyKey })}>{WAIVER_STRATEGY_REGISTRY.map((strategy) => <option key={strategy.key} value={strategy.key}>{strategy.label}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <NumericField label="Multiplier" value={config.multiplier} fallback={1} step="0.1" onValueChange={(multiplier) => onChange({ ...config, multiplier })} />
          <NumericField label="Additive modifier" value={config.modifier} allowNegative onValueChange={(modifier) => onChange({ ...config, modifier })} />
        </div>
      </> : <>
        <div className="space-y-4" aria-label="Position value curves">
          {CUSTOM_RANKING_POSITIONS.map((position) => (
            <fieldset key={position} className="rounded-xl border border-[#2a2e55] p-3">
              <legend className="px-1 font-['Space_Mono'] text-xs font-bold text-[#c7d2fe]">{position}</legend>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <NumericField label={`${position} maximum`} value={config.positionCurves[position].maxValue} onValueChange={(maxValue) => onChange({ ...config, positionCurves: { ...config.positionCurves, [position]: { ...config.positionCurves[position], maxValue } } })} />
                <NumericField label={`${position} step`} value={config.positionCurves[position].step} onValueChange={(stepValue) => onChange({ ...config, positionCurves: { ...config.positionCurves, [position]: { ...config.positionCurves[position], step: stepValue } } })} />
              </div>
            </fieldset>
          ))}
        </div>
        <div className="pt-2">
          <NumericField label="Global multiplier" value={config.multiplier} fallback={1} step="0.1" onValueChange={(multiplier) => onChange({ ...config, multiplier })} />
        </div>
      </>}

      <div className="rounded-xl border border-[#34386a] bg-[#0b0e20] p-3" aria-label="Ranking preview">
        <div className="text-[10px] uppercase tracking-wider text-[#8b8eac]">Preview</div>
        {config.mode === 'built-in'
          ? <div className="mt-1 font-['Space_Mono'] text-xs text-[#c7d2fe]">max($0, ${config.multiplier} × base {config.modifier < 0 ? '−' : '+'} ${Math.abs(config.modifier)})</div>
          : samplePosition && <div className="mt-1 font-['Space_Mono'] text-xs text-[#c7d2fe]">max($0, ({samplePosition} max − ((rank − 1) × {samplePosition} step)) × {config.multiplier})</div>}
        {sample && <div className="mt-2 text-xs text-[#8b8eac]">{sample.name}: {config.mode === 'built-in' ? `$${sampleBase}` : `${sample.position}${sample.posRank}`} → <strong className="text-[#10b981]">${preview}</strong></div>}
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
  const valid = config.name.trim().length > 0 && !duplicate && modeIsValid(config) && rows.length > 0 && !atCap;
  const change = (next: CustomRankingConfig) => {
    onConfigChange(next);
    if (next.baseRankingSource !== config.baseRankingSource) onSourceChange(next.baseRankingSource);
  };
  return <DialogFrame title="New custom ranking" onClose={onClose}>
    <RankingFields config={config} onChange={change} rows={rows} />
    {duplicate && <p className="mt-3 text-xs text-[#fbbf24]">Use a unique name in this league season.</p>}
    {atCap && <p className="mt-3 text-xs text-[#fbbf24]">Maximum 10 custom rankings. Delete one before creating another.</p>}
    {!atCap && rows.length === 0 && <p className="mt-3 text-xs text-[#fbbf24]">Loading the selected player values before the snapshot can be created.</p>}
    <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => onCreate(config)}>Create ranking</Button></div>
  </DialogFrame>;
}

export function CustomRankingSettingsDialog({ board, config, rows, existingNames, onConfigChange, onSourceChange, onSave, onReset, onDelete, onClose }: {
  board: CustomRanking | null;
  config: CustomRankingConfig | null;
  rows: readonly WaiverPlayerRow[];
  existingNames: readonly string[];
  onConfigChange: (config: CustomRankingConfig) => void;
  onSourceChange: (source: WaiverRankingSource) => void;
  onSave: (config: CustomRankingConfig, preserveOverrides: boolean) => void;
  onReset: (config: CustomRankingConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirm, setConfirm] = useState<'reset' | 'save' | null>(null);
  const [preserveOverrides, setPreserveOverrides] = useState(true);
  useEffect(() => {
    setConfirm(null);
    setPreserveOverrides(true);
  }, [board]);
  if (!board || !config) return null;
  const change = (next: CustomRankingConfig) => {
    onConfigChange(next);
    if (next.baseRankingSource !== config.baseRankingSource) onSourceChange(next.baseRankingSource);
  };
  const duplicate = existingNames.some((name) => name.trim().toLocaleLowerCase() === config.name.trim().toLocaleLowerCase());
  const valid = config.name.trim().length > 0 && !duplicate && modeIsValid(config);
  const generatedSettingsChanged = customRankingGeneratedSettingsChanged(board, config);
  const overrideCount = Object.keys(board.overrides).length;

  if (confirm === 'reset') {
    return <DialogFrame title="Confirm reset" onClose={() => setConfirm(null)}>
      <div className="flex gap-3 rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] p-4 text-sm text-[#fbbf24]"><AlertTriangle className="shrink-0" size={20} /><p>Reset regenerates every player value from the currently selected settings and permanently clears {overrideCount} manually edited {overrideCount === 1 ? 'value' : 'values'}.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button data-dialog-initial-focus variant="ghost" onClick={() => setConfirm(null)}>Keep my values</Button><Button onClick={() => onReset(config)}>Reset values</Button></div>
    </DialogFrame>;
  }

  if (confirm === 'save') {
    return <DialogFrame title="Confirm value changes" onClose={() => setConfirm(null)}>
      <div className="flex gap-3 rounded-xl border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] p-4 text-sm text-[#fbbf24]"><AlertTriangle className="shrink-0" size={20} /><p>Saving these settings will regenerate all player values. Existing generated values will be replaced.</p></div>
      <p className="mt-4 text-sm text-[#d2d4ea]">{overrideCount} player {overrideCount === 1 ? 'value has' : 'values have'} been edited.</p>
      <label className="mt-4 flex min-h-11 items-center gap-3 rounded-lg border border-[#2a2e55] px-3 text-sm text-[#d2d4ea]">
        <input type="checkbox" checked={preserveOverrides} onChange={(event) => setPreserveOverrides(event.target.checked)} className="h-4 w-4 accent-[#6366f1]" />
        Preserve edited player values
      </label>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button data-dialog-initial-focus variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button onClick={() => onSave(config, preserveOverrides)}>Save changes</Button></div>
    </DialogFrame>;
  }

  return <DialogFrame title="Custom ranking settings" onClose={onClose}>
    <RankingFields config={config} onChange={change} rows={rows} sourceChanged={config.baseRankingSource !== board.baseRankingSource} />
    {duplicate && <p className="mt-4 text-xs text-[#fbbf24]">Use a unique name in this league season.</p>}
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      <Button variant="ghost" disabled={!valid || rows.length === 0} onClick={() => setConfirm('reset')}>Reset values</Button>
      <Button disabled={!valid || (generatedSettingsChanged && rows.length === 0)} onClick={() => generatedSettingsChanged ? setConfirm('save') : onSave(config, true)}>Save</Button>
    </div>
    <div className="mt-5 border-t border-[#2a2e55] pt-5">
      <Button className="w-full" variant="ghost" onClick={onDelete}>Delete ranking</Button>
    </div>
  </DialogFrame>;
}

export function ConfirmDeleteCustomRankingDialog({ board, onConfirm, onClose }: { board: CustomRanking | null; onConfirm: () => void; onClose: () => void }) {
  if (!board) return null;
  return <DialogFrame title="Delete custom ranking?" onClose={onClose}>
    <p className="text-sm text-[#d2d4ea]">Delete <strong>{board.name}</strong>? Its frozen values and manual overrides will be permanently removed.</p>
    <p className="mt-3 text-xs leading-relaxed text-[#8b8eac]">Built-in values, predicted winning bids, completed or losing bid history, source-relative rank, and Team Impact are not changed.</p>
    <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={onConfirm}>Delete ranking</Button></div>
  </DialogFrame>;
}
