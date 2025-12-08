import { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader.jsx";
import Table from "../components/Table.jsx";
import { fetchDataset, fetchNames } from "../services/api.js";
import { formatCurrency, formatDate, formatNumber } from "../utils/formatters.js";

const PAGE_SIZE = 50;

function Dataset() {
  const [dataset, setDataset] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [allNames, setAllNames] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedName, setSelectedName] = useState("All");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Debounce search to avoid spamming API requests
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load list of stock names once
  useEffect(() => {
    const loadNames = async () => {
      try {
        const namesRes = await fetchNames();
        setAllNames(Array.isArray(namesRes) ? namesRes : []);
      } catch (err) {
        console.error(err);
        setAllNames([]);
      }
    };
    loadNames();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedName, dateRange.start, dateRange.end, debouncedSearch]);

  // Fetch dataset whenever page or filters change
  useEffect(() => {
    const loadDataset = async () => {
      setLoading(true);
      try {
        const { data, pagination } = await fetchDataset({
          page,
          perPage: PAGE_SIZE,
          symbol: selectedName,
          search: debouncedSearch,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined
        });
        setDataset(Array.isArray(data) ? data : []);
        setPagination(pagination);
        setError("");
      } catch (err) {
        console.error(err);
        setDataset([]);
        setPagination(null);
        setError("Unable to load dataset.");
      } finally {
        setLoading(false);
      }
    };
    loadDataset();
  }, [page, selectedName, dateRange.start, dateRange.end, debouncedSearch]);

  const names = useMemo(() => {
    const datasetNames = Array.from(new Set(dataset.map((row) => row.Name))).filter(Boolean);
    const combined = Array.from(new Set([...allNames, ...datasetNames]));
    return ["All", ...combined.sort()];
  }, [dataset, allNames]);

  const currentPage = pagination?.page ?? page;
  const totalPages = pagination?.total_pages ?? 1;
  const perPage = pagination?.per_page ?? PAGE_SIZE;
  const totalRows = pagination?.total_rows ?? dataset.length;
  const startRow =
    totalRows === 0 || dataset.length === 0
      ? 0
      : (currentPage - 1) * perPage + 1;
  const endRow = startRow === 0 ? 0 : startRow + dataset.length - 1;
  const hasPrev = pagination ? pagination.has_prev : currentPage > 1;
  const hasNext = pagination ? pagination.has_next : dataset.length === perPage;

  const columns = [
    { key: "Date", title: "Date", render: (value) => formatDate(value) },
    { key: "Name", title: "Name" },
    { key: "Open", title: "Open", render: (value) => formatCurrency(value) },
    { key: "High", title: "High", render: (value) => formatCurrency(value) },
    { key: "Low", title: "Low", render: (value) => formatCurrency(value) },
    { key: "Close", title: "Close", render: (value) => formatCurrency(value) },
    { key: "Volume", title: "Volume", render: (value) => formatNumber(value) }
  ];

  if (loading) return <Loader label="Loading dataset..." />;
  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-red-600">
        <p className="font-semibold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Dataset Explorer</h2>
        <p className="text-sm text-gray-500">Search, filter, and paginate Pakistan Stock Exchange records.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-2"
          />
          <select
            value={selectedName}
            onChange={(event) => setSelectedName(event.target.value)}
            className="rounded-lg border border-gray-200 px-4 py-2"
          >
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateRange.start}
            onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))}
            className="rounded-lg border border-gray-200 px-4 py-2"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))}
            className="rounded-lg border border-gray-200 px-4 py-2"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <Table columns={columns} data={dataset} emptyLabel="No rows match the filters" />

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <p>
            {totalRows === 0
              ? "No rows found"
              : `Showing ${startRow}-${endRow} of ${totalRows.toLocaleString()} rows`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!hasPrev}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {currentPage} / {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!hasNext}
              className="rounded-lg border border-gray-200 px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dataset;

