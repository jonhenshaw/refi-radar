interface Props {
  onReset: () => void;
}

export function ZoomResetChip({ onReset }: Props) {
  return (
    <button
      type="button"
      onClick={onReset}
      aria-label="Reset zoom"
      className="absolute right-2 top-2 z-10 rounded-sm border border-line-strong bg-surface-1/95 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted hover:text-fg hover:bg-surface-2"
    >
      Reset zoom
    </button>
  );
}
