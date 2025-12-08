import { useEffect, useState } from "react";
import {
  fetchChartData,
  fetchHistory,
  fetchMetrics,
  fetchTodayPrediction,
  fetchRecentData,
  fetchStockChanges
} from "../services/api.js";
import MetricsCard from "../components/MetricsCard.jsx";
import Table from "../components/Table.jsx";
import ChartCard from "../components/ChartCard.jsx";
import Loader from "../components/Loader.jsx";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [stockChanges, setStockChanges] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [metricsRes, historyRes, chartRes, latestRes, changesRes] = await Promise.all([
          fetchMetrics(),
          fetchHistory(10),
          fetchChartData(null, 100), // Get all chart data, limit 100
          fetchTodayPrediction(),
          fetchStockChanges()
        ]);
        setMetrics(metricsRes);
        setHistory(Array.isArray(historyRes) ? historyRes : []);
        // Get recent 60 items for chart
        const chartDataArray = Array.isArray(chartRes) ? chartRes.slice(-60) : [];
        setChartData(chartDataArray);
        setLatestPrediction(latestRes);
        setStockChanges(Array.isArray(changesRes) ? changesRes : []);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Unable to load dashboard data. Please try again.");
        setMetrics(null);
        setHistory([]);
        setChartData([]);
        setLatestPrediction(null);
        setStockChanges([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Auto-rotate slideshow in infinite loop
  useEffect(() => {
    if (stockChanges.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % stockChanges.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [stockChanges.length]);

  if (loading) return <Loader label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-red-600">
        <p className="font-semibold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const columns = [
    { key: "Date", title: "Date", render: (value) => formatDate(value) },
    { key: "Name", title: "Name" },
    {
      key: "Close",
      title: "Close Price",
      render: (value) => formatCurrency(value)
    },
    {
      key: "Volume",
      title: "Volume",
      render: (value) => value ? Number(value).toLocaleString() : "—"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 p-6 text-white shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary-100">Today&apos;s Prediction</p>
          <p className="mt-2 text-4xl font-semibold">
            {latestPrediction ? (latestPrediction.predicted_close ? formatCurrency(latestPrediction.predicted_close) : (latestPrediction.Close ? formatCurrency(latestPrediction.Close) : "No data")) : "No prediction yet"}
          </p>
          {latestPrediction && (
            <p className="text-sm text-primary-100">
              {latestPrediction.name || latestPrediction.Name ? `For ${latestPrediction.name || latestPrediction.Name}` : ""} {latestPrediction.requested_date ? `on ${formatDate(latestPrediction.requested_date)}` : latestPrediction.Date ? `on ${formatDate(latestPrediction.Date)}` : ""}
            </p>
          )}
        </div>
        <div className="text-sm md:text-right">
          <p>Powered by RandomForestRegressor</p>
          <p className="text-primary-100">Features: OHLC, Volume, 3 lags</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricsCard 
          title="Mean Squared Error" 
          value={metrics && (metrics.mse !== null && metrics.mse !== undefined) ? metrics.mse.toFixed(2) : "—"} 
        />
        <MetricsCard 
          title="R² Score" 
          value={metrics && (metrics.r2 !== null && metrics.r2 !== undefined) ? metrics.r2.toFixed(3) : "—"} 
          accent="success" 
        />
        <MetricsCard
          title="Predictions Tracked"
          value={history.length}
          subtitle="Last 10 requests"
          accent="warning"
        />
      </div>

      {stockChanges.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">📊 Market Movers - All Stocks</h3>
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    {stockChanges[currentSlideIndex % stockChanges.length]?.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      stockChanges[currentSlideIndex % stockChanges.length]?.direction === "up"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {stockChanges[currentSlideIndex % stockChanges.length]?.direction === "up" ? "▲" : "▼"}{" "}
                    {Math.abs(stockChanges[currentSlideIndex % stockChanges.length]?.change_percent || 0).toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-400">
                    ({currentSlideIndex + 1} / {stockChanges.length})
                  </span>
                </div>
                <div className="flex items-baseline gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Current</span>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(stockChanges[currentSlideIndex % stockChanges.length]?.current_price || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Change</span>
                    <p
                      className={`text-lg font-semibold ${
                        stockChanges[currentSlideIndex % stockChanges.length]?.direction === "up"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stockChanges[currentSlideIndex % stockChanges.length]?.direction === "up" ? "+" : ""}
                      {formatCurrency(stockChanges[currentSlideIndex % stockChanges.length]?.change || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + stockChanges.length) % stockChanges.length)}
                  className="rounded-lg bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                  aria-label="Previous stock"
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % stockChanges.length)}
                  className="rounded-lg bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
                  aria-label="Next stock"
                >
                  →
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 max-h-32 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {stockChanges.map((stock, index) => (
                <div
                  key={`${stock.name}-${index}`}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-all ${
                    (index % stockChanges.length) === (currentSlideIndex % stockChanges.length)
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="font-medium">{stock.name}</span>
                  <span
                    className={`ml-1 ${
                      stock.direction === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stock.direction === "up" ? "▲" : "▼"} {Math.abs(stock.change_percent).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="📈 Recent Close Trend" description="Close price trend">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis 
                    dataKey="Date" 
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    stroke="#9ca3af"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.98)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    }}
                    formatter={(value) => {
                      if (value == null || isNaN(value)) return "N/A";
                      return `PKR ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Close" 
                    stroke="#4f46e5" 
                    strokeWidth={3} 
                    dot={false} 
                    name="Close"
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Predicted"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={false}
                    name="Predicted"
                    strokeDasharray="5 5"
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No chart data available
              </div>
            )}
          </ChartCard>
        </div>
        <div>
          <Table columns={columns} data={history} emptyLabel="No predictions yet" />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

