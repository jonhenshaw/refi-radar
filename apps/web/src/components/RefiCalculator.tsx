import { useEffect, useMemo, useRef, useState } from 'react';

import { breakEvenMonths, monthlyPayment, monthlySavings, type RefiInput, type RefiResult } from '@refi-radar/shared';

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
  onChange: (value: string) => void;
}

function Field({ label, value, suffix, onChange }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
        />
        {suffix ? <span className="field-suffix">{suffix}</span> : null}
      </span>
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

export function RefiCalculator({ suggestedRate = 6.35 }: { suggestedRate?: number }) {
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

  const result = useMemo(
    () =>
      calculateRefiScenario({
        balance: numericValue(balance),
        currentRate: numericValue(currentRate),
        newRate: numericValue(newRate),
        termYears: numericValue(termYears),
        closingCosts: numericValue(closingCosts),
      }),
    [balance, closingCosts, currentRate, newRate, termYears],
  );

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
        <Field label="Loan balance" value={balance} onChange={setBalance} />
        <Field label="Current rate" value={currentRate} suffix="%" onChange={setCurrentRate} />
        <Field
          label="New rate"
          value={newRate}
          suffix="%"
          onChange={(value) => {
            userEditedNewRate.current = true;
            setNewRate(value);
          }}
        />
        <Field label="Term years" value={termYears} suffix="years" onChange={setTermYears} />
        <div className="calculator-grid-full">
          <Field label="Closing costs" value={closingCosts} onChange={setClosingCosts} />
        </div>
      </div>

      <div data-testid="refi-summary" className="calculator-summary">
        <SummaryStat label="Current payment" value={currency.format(result.currentPayment)} />
        <SummaryStat label="New payment" value={currency.format(result.newPayment)} />
        <SummaryStat
          label="Monthly savings"
          value={`${currency.format(result.monthlySavings)}/mo`}
          emphasis={result.monthlySavings > 0 ? 'good' : 'flat'}
        />
        <SummaryStat
          label="Break-even"
          value={result.breakEvenMonths === null || !Number.isFinite(result.breakEvenMonths) ? 'Never' : `${result.breakEvenMonths} months`}
          emphasis={result.monthlySavings > 0 ? 'good' : 'flat'}
        />
      </div>
    </section>
  );
}
