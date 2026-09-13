interface Props {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function QualitySelector({ label, options, value, onChange, disabled }: Props) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              value === opt.value
                ? "border-ink bg-ink text-paper"
                : "border-black/10 bg-white text-ink/70 hover:border-black/20"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
