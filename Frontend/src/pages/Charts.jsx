import { useEffect, useMemo, useState } from "react";
import { fetchChartData, fetchNames } from "../services/api.js";
import ChartCard from "../components/ChartCard.jsx";
import Loader from "../components/Loader.jsx";
import CandlestickChart from "../components/CandlestickChart.jsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function Charts() {
  const [data, setData] = useState([]);
  const [allNames, setAllNames] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load stock names on mount
  useEffect(() => {
    const loadNames = async () => {
      try {
        const namesRes = await fetchNames();
        setAllNames(Array.isArray(namesRes) ? namesRes : []);
        if (namesRes && namesRes.length > 0 && !selectedName) {
          setSelectedName(namesRes[0]);
        }
      } catch (err) {
        console.error("Error loading stock names:", err);
        setAllNames([]);
      }
    };

    loadNames();
  }, []);

  // Fetch chart data when selectedName changes
  useEffect(() => {
    if (!selectedName) return;

    const loadChartData = async () => {
      setLoading(true);
      setError("");
      try {
        console.log("Fetching chart data for:", selectedName);
        const chartRes = await fetchChartData(selectedName, 1000);
        console.log("Chart data loaded:", chartRes?.length || 0, "items for", selectedName);
        
        if (chartRes && Array.isArray(chartRes) && chartRes.length > 0) {
          // Sort by date to ensure proper order for moving averages
          const sortedData = [...chartRes].sort((a, b) => {
            const dateA = new Date(a.Date || a.date || 0);
            const dateB = new Date(b.Date || b.date || 0);
            return dateA - dateB;
          });
          
          // Log prediction data for debugging
          const hasPredictions = sortedData.some(d => d.Predicted != null && !isNaN(d.Predicted));
          const predictionCount = sortedData.filter(d => d.Predicted != null && !isNaN(d.Predicted)).length;
          console.log(`[Charts] Prediction data check for ${selectedName}:`);
          console.log(`  - Total records: ${sortedData.length}`);
          console.log(`  - Records with predictions: ${predictionCount}`);
          console.log(`  - Has predictions: ${hasPredictions}`);
          if (hasPredictions) {
            console.log(`  - Sample predictions:`, sortedData.slice(0, 5).map(d => ({ 
              date: d.Date, 
              close: d.Close, 
              predicted: d.Predicted 
            })));
          }
          
          // Calculate moving averages
          const dataWithMA = sortedData.map((item, index) => {
            const ma7 = calculateMA(sortedData, index, 7, 'Close');
            const ma30 = calculateMA(sortedData, index, 30, 'Close');
            // Ensure Predicted is a number or null
            const predicted = item.Predicted != null && !isNaN(item.Predicted) 
              ? Number(item.Predicted) 
              : null;
            return {
              ...item,
              MA7: ma7,
              MA30: ma30,
              Predicted: predicted,
              Close: item.Close || item.close || null
            };
          });
          setData(dataWithMA);
          console.log(`Successfully loaded ${dataWithMA.length} records for ${selectedName}`);
        } else {
          console.warn("Invalid chart data format or empty:", chartRes);
          setData([]);
          if (chartRes && chartRes.length === 0) {
            setError(`No data available for ${selectedName}.`);
          }
        }
      } catch (err) {
        console.error("Error loading chart data:", err);
        setError(`Unable to load chart data for ${selectedName}. Please check if the stock exists in the dataset.`);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [selectedName]);

  // Helper function to calculate moving average
  const calculateMA = (data, index, period, key) => {
    if (index < period - 1) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const values = slice
      .map(item => {
        const value = item[key] || item[key.toLowerCase()];
        return value != null && !isNaN(value) ? Number(value) : null;
      })
      .filter(v => v !== null);
    
    if (values.length === 0) return null;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  // Data is already filtered by the API for the selected stock
  // Just filter out any invalid/null rows
  const filtered = useMemo(
    () => {
      try {
        return data.filter((row) => {
          if (!row) return false;
          // Verify the row belongs to the selected stock (safety check)
          const rowName = row.Name || row.name;
          if (selectedName && rowName && rowName !== selectedName) {
            return false;
          }
          return true;
        });
      } catch (err) {
        console.error("Error filtering data:", err);
        return [];
      }
    },
    [data, selectedName]
  );

  const uniqueNames = useMemo(() => {
    try {
      const dataNames = Array.from(new Set(data.map((row) => row?.Name || row?.name).filter(Boolean)));
      const combined = Array.from(new Set([...allNames, ...dataNames]));
      return combined.sort();
    } catch (err) {
      console.error("Error getting unique names:", err);
      return allNames;
    }
  }, [data, allNames]);

  if (loading) return <Loader label="Loading charts..." />;
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
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 shadow-lg md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">📊 Interactive Charts</h2>
          <p className="text-sm text-indigo-100">Explore OHLC, volume, and prediction performance with professional visualizations.</p>
        </div>
        <select
          value={selectedName}
          onChange={(event) => setSelectedName(event.target.value)}
          className="rounded-lg border-0 bg-white/90 backdrop-blur-sm px-4 py-2.5 font-medium text-gray-700 shadow-md transition-all hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          {uniqueNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <ChartCard
        title="📈 Close Price with Moving Averages"
        description="Actual Close vs 7-day and 30-day moving averages"
      >
        {filtered && filtered.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
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
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="Close" 
                stroke="#4f46e5" 
                strokeWidth={3} 
                dot={false}
                name="Close Price"
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="MA7" 
                stroke="#22c55e" 
                strokeWidth={2.5} 
                dot={false}
                strokeDasharray="5 5"
                name="MA 7-day"
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="MA30" 
                stroke="#f97316" 
                strokeWidth={2.5} 
                dot={false}
                strokeDasharray="5 5"
                name="MA 30-day"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for selected stock
          </div>
        )}
      </ChartCard>

      <ChartCard title="🕯️ Candlestick Chart (OHLC)" description="Professional candlestick visualization showing Open, High, Low, and Close prices">
        {filtered && filtered.length > 0 ? (
          <CandlestickChart data={filtered} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for selected stock
          </div>
        )}
      </ChartCard>

      <ChartCard title="📊 Daily Price Range (High - Low)" description="Bar chart showing the price range (volatility) for each trading day">
        {filtered && filtered.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={filtered
                .filter(item => item.High != null && item.Low != null)
                .map(item => ({
                  ...item,
                  priceRange: Math.abs((item.High || 0) - (item.Low || 0)),
                  isPositive: (item.Close || 0) >= (item.Open || 0)
                }))} 
              margin={{ top: 10, right: 20, bottom: 60, left: 20 }}
            >
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
                label={{ value: "Price Range (PKR)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fill: "#6b7280", fontSize: "12px" } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                }}
                formatter={(value, name, props) => {
                  const data = props.payload;
                  return [
                    `PKR ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `Range: High PKR ${Number(data.High || 0).toFixed(2)} - Low PKR ${Number(data.Low || 0).toFixed(2)}`
                  ];
                }}
              />
              <Bar 
                dataKey="priceRange" 
                radius={[4, 4, 0, 0]}
                name="Price Range"
              >
                {filtered
                  .filter(item => item.High != null && item.Low != null)
                  .map((entry, index) => {
                    const isPositive = (entry.Close || 0) >= (entry.Open || 0);
                    return (
                      <Cell 
                        key={`range-cell-${index}`} 
                        fill={isPositive ? "#10b981" : "#ef4444"}
                      />
                    );
                  })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for selected stock
          </div>
        )}
      </ChartCard>

      <ChartCard title="📊 Trading Volume" description="Daily traded volume bars">
        {filtered && filtered.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
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
                  return Number(value).toLocaleString("en-US");
                }}
              />
              <Bar 
                dataKey="Volume" 
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              >
                {filtered.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0ea5e9" : "#0284c7"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for selected stock
          </div>
        )}
      </ChartCard>

      <ChartCard title="🎯 Prediction vs Actual" description="Actual close series (line) with predicted points overlaid">
        {filtered && filtered.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filtered} margin={{ top: 10, right: 20, bottom: 60, left: 10 }}>
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
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="Close" 
                stroke="#4f46e5" 
                strokeWidth={3}
                dot={false}
                name="Actual Close"
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                data={filtered}
                dataKey="Predicted"
                stroke="#f97316"
                strokeWidth={3}
                strokeDasharray="6 6"
                dot={false}
                name="Predicted Close"
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for selected stock
          </div>
        )}
      </ChartCard>
    </div>
  );
}

export default Charts;

