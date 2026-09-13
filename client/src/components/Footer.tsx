export default function Footer() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-xs text-ink/40 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Convertly. All rights reserved.</p>
        <p>Only convert videos you own or have permission to download.</p>
      </div>
    </footer>
  );
}
