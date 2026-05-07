interface Props {
  onReset: () => void;
}

export function ZoomResetChip({ onReset }: Props) {
  return (
    <button type="button" className="chart-zoom-reset" onClick={onReset} aria-label="Reset zoom">
      Reset zoom
    </button>
  );
}
