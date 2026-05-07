import { useEffect, useMemo, useRef, useState } from 'react';

import { breakEvenMonths, monthlyPayment, monthlySavings, type RefiInput, type RefiResult } from '@refi-radar/shared';

interface FieldValidation {
  min?: number;
  max?: number;
  message?: string;
}

function validate(value: string, rules: FieldValidation): string | null {
  if (value.trim() === '') return 'Required';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 'Must be a number';
  if (rules.min !== undefined && parsed < rules.min) {
    return rules.message ?? `Must be ≥ ${rules.min}`;
  }
  if (rules.max !== undefined && parsed > rules.max) {
    return rules.message ?? `Must be ≤ ${rules.max}`;
  }
  return null;
}

export type { RefiInput, RefiResult } from '@refi-radar/shared';

export function calculateRefiScenario(input: RefiInput): RefiResult {
  const months = input.termYears * 12;
  const currentPayment = monthlyPayment(input.balance, input.currentRate, months);
  const newPayment = monthlyPayment(input.balance, input.newRate, months);
  const savings = monthlySavings(currentPayment, newPayment);

  return {
    currentPayment,
    newPayment,
    monthlySavings: savings,
    breakEvenMonths: breakEvenMonths(input.closingCosts, savings),
  };
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function numericValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

interface FieldProps {
  label: string;
  value: string;
  suffix?: string;
  error?: string | null;
  onChange: (value: string) => void;
}

function Field({ label, value, suffix, error, onChange }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className={`field-input${error ? ' field-input-error' : ''}`}>
        <input
          aria-label={label}
          aria-invalid={error ? true : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
        />
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </span>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  emphasis?: 'good' | 'flat';
}

function SummaryStat({ label, value, emphasis = 'flat' }: SummaryStatProps) {
  return (
    <div className={`summary-stat summary-stat-${emphasis}`}>
      <p className="summary-stat-label">{label}</p>
      <p className="summary-stat-value">{value}</p>
    </div>
  );
}

interface RefiCalculatorProps {
  suggestedRate?: number;
  onResult?: (result: RefiResult) => void;
}

export function RefiCalculator({ suggestedRate = 6.35, onResult }: RefiCalculatorProps) {
  const [balance, setBalance] = useState('425000');
  const [currentRate, setCurrentRate] = useState('7.15');
  const [newRate, setNewRate] = useState(String(suggestedRate.toFixed(2)));
  const userEditedNewRate = useRef(false);
  const [termYears, setTermYears] = useState('30');
  const [closingCosts, setClosingCosts] = useState('4500');

  useEffect(() => {
    if (!userEditedNewRate.current) {
      setNewRate(suggestedRate.toFixed(2));
    }
  }, [suggestedRate]);

  const balanceError = validate(balance, { min: 1, message: 'Must be positive' });
  const currentRateError = validate(currentRate, { min: 0, max: 30, message: 'Enter a rate between 0 and 30' });
  const newRateError = validate(newRate, { min: 0, max: 30, message: 'Enter a rate between 0 and 30' });
  const termError = validate(termYears, { min: 1, max: 50, message: 'Term between 1 and 50 years' });
  const closingError = validate(closingCosts, { min: 0, message: 'Cannot be negative' });
  const hasError = !!(balanceError || currentRateError || newRateError || termError || closingError);

  const result = useMemo(
    () =>
      hasError
        ? { currentPayment: 0, newPayment: 0, monthlySavings: 0, breakEvenMonths: null as number | null }
        : calculateRefiScenario({
            balance: numericValue(balance),
            currentRate: numericValue(currentRate),
            newRate: numericValue(newRate),
            termYears: numericValue(termYears),
            closingCosts: numericValue(closingCosts),
          }),
    [hasError, balance, closingCosts, currentRate, newRate, termYears],
  );

  useEffect(() => {
    onResult?.(result);
  }, [onResult, result]);

  return (
    <section className="panel calculator-card">
      <header className="card-head">
        <div>
          <p className="card-eyebrow">Refinance calculator</p>
          <h2 className="card-title">Model your break-even</h2>
        </div>
        <span className="pill pill-neutral">Local calc</span>
      </header>

      <div className="calculator-grid">
        <Field label="Loan balance" value={balance} error={balanceError} onChange={setBalance} />
        <Field label="Current rate" value={currentRate} suffix="%" error={currentRateError} onChange={setCurrentRate} />
        <Field
          label="New rate"
          value={newRate}
          suffix="%"
          error={newRateError}
          onChange={(value) => {
            userEditedNewRate.current = true;
            setNewRate(value);
          }}
        />
        <Field label="Term years" value={termYears} suffix="years" error={termError} onChange={setTermYears} />
        <div className="calculator-grid-full">
          <Field label="Closing costs" value={closingCosts} error={closingError} onChange={setClosingCosts} />
        </div>
      </div>

      <div data-testid="refi-summary" className="calculator-summary">
        <SummaryStat
          label="Current payment"
          value={hasError ? '—' : currency.format(result.currentPayment)}
        />
        <SummaryStat label="New payment" value={hasError ? '—' : currency.format(result.newPayment)} />
        <SummaryStat
          label="Monthly savings"
          value={hasError ? '—' : `${currency.format(result.monthlySavings)}/mo`}
          emphasis={!hasError && result.monthlySavings > 0 ? 'good' : 'flat'}
        />
        <SummaryStat
          label="Break-even"
          value={
            hasError
              ? '—'
              : result.breakEvenMonths === null || !Number.isFinite(result.breakEvenMonths)
                ? 'Never'
                : `${result.breakEvenMonths} months`
          }
          emphasis={!hasError && result.monthlySavings > 0 ? 'good' : 'flat'}
        />
      </div>
    </section>
  );
}
