function Loader({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
      <span className="ml-3 text-sm text-gray-600">{label}</span>
    </div>
  );
}

export default Loader;

