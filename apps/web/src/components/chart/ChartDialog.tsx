import { useEffect, useRef, type ReactNode } from 'react';

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
      className="chart-dialog"
      aria-label={title ?? 'Expanded chart'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="chart-dialog-body" onClick={(e) => e.stopPropagation()}>
        <header className="chart-dialog-head">
          <div>
            {subtitle ? <p className="chart-dialog-eyebrow">{subtitle}</p> : null}
            {title ? <h2 className="chart-dialog-title">{title}</h2> : null}
          </div>
          <button type="button" className="chart-dialog-close" onClick={onClose} aria-label="Close expanded chart">
            ✕
          </button>
        </header>
        <div className="chart-dialog-content">{children}</div>
        <p className="chart-dialog-hint">
          Drag to zoom · pinch to zoom · arrow keys move · <kbd>+</kbd>/<kbd>-</kbd> zoom · <kbd>Esc</kbd> resets
        </p>
      </div>
    </dialog>
  );
}
