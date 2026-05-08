import { useEffect, useMemo, useRef, useState } from 'react';

import { breakEvenMonths, monthlyPayment, monthlySavings, type RefiInput, type RefiResult } from '@refi-radar/shared';

import { SavingsCurve } from './SavingsCurve';

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
  inputMode?: 'decimal' | 'numeric';
}

function Field({ label, value, suffix, error, onChange, inputMode = 'decimal' }: FieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</span>
      <span
        className={`flex items-center rounded-sm border px-2 py-1.5 ${
          error ? 'border-bad' : 'border-line focus-within:border-line-strong'
        } bg-surface-2`}
      >
        <input
          aria-label={label}
          aria-invalid={error ? true : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          className="w-full bg-transparent font-mono-tnum text-fg outline-none"
        />
        {suffix ? <span className="font-mono-tnum text-fg-dim text-xs ml-1">{suffix}</span> : null}
      </span>
      {error ? <span className="text-[10px] text-bad">{error}</span> : null}
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
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-fg-dim">{label}</p>
      <p className={`font-mono-tnum text-base ${emphasis === 'good' ? 'tone-good' : 'text-fg'}`}>{value}</p>
    </div>
  );
}

interface RefiCalculatorProps {
  suggestedRate?: number;
  onResult?: (result: RefiResult) => void;
  onNewRateChange?: (rate: number) => void;
}

export function RefiCalculator({ suggestedRate = 6.35, onResult, onNewRateChange }: RefiCalculatorProps) {
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

  const pushNewRate = (raw: string) => {
    if (!onNewRateChange) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0 && parsed < 30) {
      onNewRateChange(parsed);
    }
  };

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
    <section className="flex flex-col gap-4 border border-line rounded-md bg-surface-1/40 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">Refinance calculator</p>
          <h2 className="text-lg font-semibold tracking-tight text-fg">Model your break-even</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            userEditedNewRate.current = true;
            const next = suggestedRate.toFixed(2);
            setNewRate(next);
            pushNewRate(next);
          }}
          className="rounded-sm border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-fg-muted hover:text-fg hover:border-line-strong"
        >
          Use today
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Loan balance" value={balance} error={balanceError} onChange={setBalance} suffix="$" />
        <Field label="Current rate" value={currentRate} suffix="%" error={currentRateError} onChange={setCurrentRate} />
        <Field
          label="New rate"
          value={newRate}
          suffix="%"
          error={newRateError}
          onChange={(value) => {
            userEditedNewRate.current = true;
            setNewRate(value);
            pushNewRate(value);
          }}
        />
        <Field label="Term" value={termYears} suffix="yrs" error={termError} onChange={setTermYears} inputMode="numeric" />
        <div className="sm:col-span-2">
          <Field label="Closing costs" value={closingCosts} error={closingError} onChange={setClosingCosts} suffix="$" />
        </div>
      </div>

      {!hasError ? (
        <div className="border border-line rounded-sm bg-surface-2 p-2">
          <SavingsCurve
            balance={numericValue(balance)}
            currentRate={numericValue(currentRate)}
            termYears={numericValue(termYears)}
            newRate={numericValue(newRate)}
          />
        </div>
      ) : null}

      <div
        data-testid="refi-summary"
        className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-line"
      >
        <div className="border-r border-b border-line">
          <SummaryStat label="Current payment" value={hasError ? '—' : currency.format(result.currentPayment)} />
        </div>
        <div className="border-r border-b border-line">
          <SummaryStat label="New payment" value={hasError ? '—' : currency.format(result.newPayment)} />
        </div>
        <div className="border-r border-b border-line">
          <SummaryStat
            label="Monthly savings"
            value={hasError ? '—' : `${currency.format(result.monthlySavings)}/mo`}
            emphasis={!hasError && result.monthlySavings > 0 ? 'good' : 'flat'}
          />
        </div>
        <div className="border-r border-b border-line">
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
      </div>
    </section>
  );
}
