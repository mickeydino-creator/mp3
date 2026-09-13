interface Props {
  progress: number;
  label: string;
}

export default function ProgressBar({ progress, label }: Props) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-ink/70">{label}</span>
        <span className="tabular-nums text-ink/40">{clamped}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
