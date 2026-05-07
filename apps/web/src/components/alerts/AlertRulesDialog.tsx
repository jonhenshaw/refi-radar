import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import { describeRule, type AlertRuleType, type LocalAlertRule, type SourceId } from '@refi-radar/shared';

import type { NewRuleInput } from '../../hooks/useAlertRules';
import { SOURCE_LABELS, SOURCE_ORDER } from '../../lib/sourceTheme';

const TYPE_OPTIONS: Array<{ id: AlertRuleType; label: string; suffix: string; defaultThreshold: number }> = [
  { id: 'below_rate', label: 'Rate drops to or below', suffix: '%', defaultThreshold: 6.25 },
  { id: 'above_rate', label: 'Rate climbs to or above', suffix: '%', defaultThreshold: 7.5 },
  { id: 'drop_from_recent_high_bps', label: 'Falls from recent high', suffix: 'bps', defaultThreshold: 25 },
  { id: 'break_even_below_months', label: 'Refi break-even below', suffix: 'months', defaultThreshold: 24 },
];

interface Props {
  open: boolean;
  onClose: () => void;
  rules: LocalAlertRule[];
  onAdd: (rule: NewRuleInput) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const fieldClass =
  'flex items-center rounded-sm border border-line bg-surface-2 px-2 py-1.5 focus-within:border-line-strong';
const inputClass = 'w-full bg-transparent font-mono-tnum text-fg outline-none text-[13px]';
const selectClass = 'w-full bg-transparent text-fg outline-none text-[13px]';
const labelClass = 'flex flex-col gap-1';
const labelTextClass = 'text-[10px] uppercase tracking-wider text-fg-dim';

export function AlertRulesDialog({ open, onClose, rules, onAdd, onToggle, onDelete }: Props) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sourceId, setSourceId] = useState<SourceId>('mnd_30y_fixed');
  const [type, setType] = useState<AlertRuleType>('below_rate');
  const [threshold, setThreshold] = useState<string>('6.25');
  const [cooldown, setCooldown] = useState<string>('360');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) {
      try {
        node.showModal();
      } catch {
        node.show();
      }
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const handleClose = () => onClose();
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    node.addEventListener('close', handleClose);
    node.addEventListener('cancel', handleCancel);
    return () => {
      node.removeEventListener('close', handleClose);
      node.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  const typeMeta = TYPE_OPTIONS.find((t) => t.id === type) ?? TYPE_OPTIONS[0];

  function resetForm() {
    setDrafting(false);
    setSourceId('mnd_30y_fixed');
    setType('below_rate');
    setThreshold('6.25');
    setCooldown('360');
    setError(null);
  }

  function handleTypeChange(next: AlertRuleType) {
    const meta = TYPE_OPTIONS.find((t) => t.id === next);
    setType(next);
    if (meta) setThreshold(String(meta.defaultThreshold));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericThreshold = Number(threshold);
    const numericCooldown = Number(cooldown);
    if (!Number.isFinite(numericThreshold) || numericThreshold <= 0) {
      setError('Enter a positive threshold value.');
      return;
    }
    if (!Number.isFinite(numericCooldown) || numericCooldown < 0) {
      setError('Cooldown must be zero or more minutes.');
      return;
    }
    onAdd({
      sourceId,
      type,
      threshold: numericThreshold,
      cooldownMinutes: Math.round(numericCooldown),
    });
    resetForm();
  }

  return (
    <dialog
      ref={ref}
      aria-label="Manage alerts"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto fixed inset-0 w-full max-w-[540px] bg-transparent p-3 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dialog-body-scroll relative flex flex-col gap-4 rounded-lg border border-line-strong bg-surface-1 p-4 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Alerts</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-fg">Manage rules</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert rules"
            className="rounded-sm border border-line p-1.5 text-fg-muted hover:text-fg hover:border-line-strong"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {rules.length === 0 ? (
          <p className="text-[12px] text-fg-muted">No rules yet. Add one below.</p>
        ) : (
          <ul className="grid gap-2">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={`flex items-start justify-between gap-3 rounded-sm border border-line bg-surface-2 p-3 ${
                  rule.enabled ? '' : 'opacity-60'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-fg">{describeRule(rule)}</p>
                  <p className="text-[10px] text-fg-dim mt-0.5 font-mono-tnum">
                    Cooldown {rule.cooldownMinutes} min
                    {rule.lastTriggeredAt
                      ? ` · last fired ${new Date(rule.lastTriggeredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => onToggle(rule.id)}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      className="sr-only peer"
                    />
                    <span
                      aria-hidden="true"
                      className="rounded-xs border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-fg-muted peer-checked:border-good peer-checked:text-good"
                    >
                      {rule.enabled ? 'On' : 'Off'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onDelete(rule.id)}
                    aria-label="Delete rule"
                    className="rounded-sm border border-line p-1.5 text-fg-muted hover:text-bad hover:border-bad/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {drafting ? (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={labelClass}>
                <span className={labelTextClass}>Source</span>
                <span className={fieldClass}>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value as SourceId)}
                    aria-label="Source"
                    className={selectClass}
                  >
                    {SOURCE_ORDER.map((id) => (
                      <option key={id} value={id}>
                        {SOURCE_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>Trigger</span>
                <span className={fieldClass}>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as AlertRuleType)}
                    aria-label="Trigger"
                    className={selectClass}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>Threshold</span>
                <span className={fieldClass}>
                  <input
                    inputMode="decimal"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    aria-label="Threshold value"
                    className={inputClass}
                  />
                  <span className="font-mono-tnum text-fg-dim text-xs ml-1">{typeMeta.suffix}</span>
                </span>
              </label>

              <label className={labelClass}>
                <span className={labelTextClass}>Cooldown</span>
                <span className={fieldClass}>
                  <input
                    inputMode="numeric"
                    value={cooldown}
                    onChange={(e) => setCooldown(e.target.value)}
                    aria-label="Cooldown in minutes"
                    className={inputClass}
                  />
                  <span className="font-mono-tnum text-fg-dim text-xs ml-1">min</span>
                </span>
              </label>
            </div>
            {error ? (
              <p role="alert" className="text-[12px] text-bad">
                {error}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-sm border border-line px-3 py-1.5 text-[12px] text-fg-muted hover:text-fg hover:border-line-strong"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12px] text-accent hover:bg-accent/20"
              >
                Save rule
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setDrafting(true)}
            className="flex items-center justify-center gap-1.5 rounded-sm border border-dashed border-line py-2 text-[12px] text-fg-muted hover:text-fg hover:border-line-strong"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add rule
          </button>
        )}
      </div>
    </dialog>
  );
}
