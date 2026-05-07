import { Bell, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'info' | 'success' | 'alert';

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  alert: Bell,
} as const;

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'border-info/40 text-info',
  success: 'border-good/40 text-good',
  alert: 'border-warn/40 text-warn',
};

interface Props {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ item, onDismiss }: Props) {
  const Icon = ICONS[item.tone];
  return (
    <div
      role="status"
      className={`toast-anim flex items-start gap-2.5 rounded-sm border bg-surface-1 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)] min-w-[260px] max-w-[360px] ${TONE_CLASS[item.tone]}`}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-fg">{item.title}</p>
        {item.body ? <p className="text-[11px] text-fg-muted mt-0.5">{item.body}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="text-fg-dim hover:text-fg p-0.5"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
