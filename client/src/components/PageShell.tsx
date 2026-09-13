interface Props {
  title: string;
  children: React.ReactNode;
}

export default function PageShell({ title, children }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <div className="prose-sm mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-ink/70">
        {children}
      </div>
    </div>
  );
}
