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

function Field({ label, value, suffix, onChange }: { label: string; value: string; suffix?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">{label}</span>
      <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/25 px-3 focus-within:border-[#1D9BF0]/70 focus-within:ring-2 focus-within:ring-[#1D9BF0]/10">
        <input
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm text-white outline-none placeholder:text-white/25"
        />
        {suffix ? <span className="text-xs text-white/35">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SummaryStat({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/35">{label}</p>
      <p className={good ? 'mt-2 font-mono text-2xl font-semibold text-emerald-300' : 'mt-2 font-mono text-2xl font-semibold text-white'}>{value}</p>
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
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9BF0]">Refinance calculator</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Model your break-even</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Local calc</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Loan balance" value={balance} onChange={setBalance} />
        <Field label="Current rate" value={currentRate} suffix="%" onChange={setCurrentRate} />
        <Field label="New rate" value={newRate} suffix="%" onChange={(value) => {
          userEditedNewRate.current = true;
          setNewRate(value);
        }} />
        <Field label="Term years" value={termYears} suffix="years" onChange={setTermYears} />
        <div className="sm:col-span-2">
          <Field label="Closing costs" value={closingCosts} onChange={setClosingCosts} />
        </div>
      </div>

      <div data-testid="refi-summary" className="mt-5 grid gap-3 sm:grid-cols-2">
        <SummaryStat label="Current payment" value={currency.format(result.currentPayment)} />
        <SummaryStat label="New payment" value={currency.format(result.newPayment)} />
        <SummaryStat label="Monthly savings" value={`${currency.format(result.monthlySavings)}/mo`} good={result.monthlySavings > 0} />
        <SummaryStat label="Break-even" value={!Number.isFinite(result.breakEvenMonths) ? 'Never' : `${result.breakEvenMonths} months`} good={result.monthlySavings > 0} />
      </div>
    </section>
  );
}
