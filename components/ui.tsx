export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-800 bg-slate-900 p-4 ${className}`}>
      {title && <h2 className="text-sm font-medium text-slate-400 mb-2">{title}</h2>}
      {children}
    </div>
  );
}

export function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-slate-100";
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function VoltageBadge({ vpu, energized }: { vpu: number; energized: boolean }) {
  if (!energized) {
    return <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">de-energized</span>;
  }
  const violation = vpu < 0.95 || vpu > 1.05;
  const cls = violation ? "bg-rose-900 text-rose-200" : "bg-emerald-900 text-emerald-200";
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{vpu.toFixed(4)} pu</span>;
}

export function SwitchBadge({ status }: { status: "open" | "closed" }) {
  const cls = status === "closed" ? "bg-sky-900 text-sky-200" : "bg-amber-900 text-amber-200";
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{status}</span>;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const base = "px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-sky-600 hover:bg-sky-500 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
    danger: "bg-rose-700 hover:bg-rose-600 text-white",
  };
  return (
    <button className={`${base} ${variants[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
