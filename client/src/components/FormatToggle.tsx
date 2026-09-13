import type { OutputFormat } from "../api";

interface Props {
  value: OutputFormat;
  onChange: (value: OutputFormat) => void;
  disabled?: boolean;
}

export default function FormatToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Output format"
      className="inline-flex rounded-xl border border-black/10 bg-white p-1 shadow-soft"
    >
      {(["mp3", "mp4"] as const).map((fmt) => (
        <button
          key={fmt}
          type="button"
          role="radio"
          aria-checked={value === fmt}
          disabled={disabled}
          onClick={() => onChange(fmt)}
          className={`w-28 rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
            value === fmt
              ? "bg-ink text-paper shadow-sm"
              : "text-ink/50 hover:text-ink"
          }`}
        >
          {fmt}
        </button>
      ))}
    </div>
  );
}
