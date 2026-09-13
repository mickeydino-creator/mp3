import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink/40">404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Page not found</h1>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper"
      >
        Back to Convertly
      </Link>
    </div>
  );
}
