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

interface Props {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ item, onDismiss }: Props) {
  const Icon = ICONS[item.tone];
  return (
    <div className={`toast toast-${item.tone}`} role="status">
      <span className="toast-icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="toast-body">
        <p className="toast-title">{item.title}</p>
        {item.body ? <p className="toast-text">{item.body}</p> : null}
      </div>
      <button type="button" className="toast-close" onClick={() => onDismiss(item.id)} aria-label="Dismiss notification">
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
