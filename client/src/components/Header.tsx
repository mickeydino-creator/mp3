import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/about", label: "About" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
];

export default function Header() {
  return (
    <header className="border-b border-black/5">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <NavLink to="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-paper">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 1.5l8 4.5-8 4.5v-9z" fill="currentColor" />
            </svg>
          </span>
          Convertly
        </NavLink>
        <nav className="flex items-center gap-6 text-sm text-ink/60">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition-colors hover:text-ink ${isActive ? "text-ink" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
