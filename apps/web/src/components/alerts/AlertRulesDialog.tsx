import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import { describeRule, type AlertRuleType, type LocalAlertRule, type SourceId } from '@refi-radar/shared';

import type { NewRuleInput } from '../../hooks/useAlertRules';

const SOURCE_OPTIONS: Array<{ id: SourceId; label: string }> = [
  { id: 'mnd_30y_fixed', label: 'MND 30Y Fixed' },
  { id: 'fred_mortgage30us', label: 'FRED Survey' },
  { id: 'fred_dgs10', label: '10Y Treasury' },
];

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
      className="alerts-dialog"
      aria-label="Manage alerts"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="alerts-dialog-body" onClick={(e) => e.stopPropagation()}>
        <header className="alerts-dialog-head">
          <div>
            <p className="alerts-dialog-eyebrow">Alerts</p>
            <h2 className="alerts-dialog-title">Manage rules</h2>
          </div>
          <button type="button" className="alerts-dialog-close" onClick={onClose} aria-label="Close alert rules">
            <X aria-hidden="true" />
          </button>
        </header>

        {rules.length === 0 ? (
          <p className="alerts-empty">No rules yet. Add one below to get notified when rates move.</p>
        ) : (
          <ul className="alert-rules-list">
            {rules.map((rule) => (
              <li key={rule.id} className={`alert-rule ${rule.enabled ? '' : 'alert-rule-off'}`}>
                <div className="alert-rule-text">
                  <p className="alert-rule-title">{describeRule(rule)}</p>
                  <p className="alert-rule-meta">
                    Cooldown {rule.cooldownMinutes} min
                    {rule.lastTriggeredAt
                      ? ` · last fired ${new Date(rule.lastTriggeredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                      : ''}
                  </p>
                </div>
                <div className="alert-rule-actions">
                  <label className="alert-rule-switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => onToggle(rule.id)}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    />
                    <span aria-hidden="true">{rule.enabled ? 'On' : 'Off'}</span>
                  </label>
                  <button
                    type="button"
                    className="alert-rule-delete"
                    onClick={() => onDelete(rule.id)}
                    aria-label="Delete rule"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {drafting ? (
          <form className="alert-rule-form" onSubmit={handleSubmit}>
            <div className="alert-rule-form-grid">
              <label className="field">
                <span className="field-label">Source</span>
                <span className="field-input">
                  <select value={sourceId} onChange={(e) => setSourceId(e.target.value as SourceId)} aria-label="Source">
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Trigger</span>
                <span className="field-input">
                  <select value={type} onChange={(e) => handleTypeChange(e.target.value as AlertRuleType)} aria-label="Trigger">
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Threshold</span>
                <span className="field-input">
                  <input
                    inputMode="decimal"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    aria-label="Threshold value"
                  />
                  <span className="field-suffix">{typeMeta.suffix}</span>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Cooldown</span>
                <span className="field-input">
                  <input
                    inputMode="numeric"
                    value={cooldown}
                    onChange={(e) => setCooldown(e.target.value)}
                    aria-label="Cooldown in minutes"
                  />
                  <span className="field-suffix">min</span>
                </span>
              </label>
            </div>
            {error ? <p className="field-error" role="alert">{error}</p> : null}
            <div className="alert-rule-form-actions">
              <button type="button" className="alert-rule-cancel" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="alert-rule-save">
                Save rule
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="alert-rule-add" onClick={() => setDrafting(true)}>
            <Plus aria-hidden="true" /> Add rule
          </button>
        )}
      </div>
    </dialog>
  );
}
