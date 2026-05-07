import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function ChartDialog({ open, onClose, title, subtitle, children }: Props) {
  const ref = useRef<HTMLDialogElement | null>(null);

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

  return (
    <dialog
      ref={ref}
      aria-label={title ?? 'Expanded chart'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto fixed inset-0 w-full max-w-[1100px] bg-transparent p-3 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dialog-body-scroll relative flex flex-col gap-4 rounded-lg border border-line-strong bg-surface-1 p-4 sm:p-6 shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            {subtitle ? (
              <p className="text-[10px] uppercase tracking-[0.18em] text-fg-dim">{subtitle}</p>
            ) : null}
            {title ? (
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-fg">{title}</h2>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close expanded chart"
            className="rounded-sm border border-line p-1.5 text-fg-muted hover:text-fg hover:border-line-strong"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
        <p className="text-[11px] text-fg-dim">
          Drag to zoom · pinch to zoom · arrow keys move ·{' '}
          <kbd className="rounded-xs border border-line px-1 font-mono-tnum text-[10px]">+</kbd>/
          <kbd className="rounded-xs border border-line px-1 font-mono-tnum text-[10px]">−</kbd> zoom ·{' '}
          <kbd className="rounded-xs border border-line px-1 font-mono-tnum text-[10px]">Esc</kbd> resets
        </p>
      </div>
    </dialog>
  );
}
