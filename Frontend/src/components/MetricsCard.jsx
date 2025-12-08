const accentMap = {
  primary: "text-primary-600",
  success: "text-emerald-600",
  warning: "text-amber-600"
};

function MetricsCard({ title, value, subtitle, accent = "primary" }) {
  const colorClass = accentMap[accent] ?? accentMap.primary;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-semibold ${colorClass}`}>{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

export default MetricsCard;

