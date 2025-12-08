function ChartCard({ title, description, children, actions }) {
  return (
    <div className="group rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg border border-gray-100">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-gray-900 mb-1">{title}</p>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="h-80 transition-opacity duration-300">{children}</div>
    </div>
  );
}

export default ChartCard;

