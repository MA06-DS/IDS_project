import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend
} from "recharts";

function CandlestickChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  // Transform data for OHLC visualization with null checks
  const chartData = data
    .filter((item) => item && item.Open != null && item.High != null && item.Low != null && item.Close != null)
    .map((item) => {
      const open = Number(item.Open);
      const high = Number(item.High);
      const low = Number(item.Low);
      const close = Number(item.Close);
      const isUp = close >= open;
      
      return {
        ...item,
        isUp,
        open,
        high,
        low,
        close,
        // For candlestick body
        bodyTop: Math.max(open, close),
        bodyBottom: Math.min(open, close),
        bodyHeight: Math.abs(close - open) || 0.01,
        // For wick (high-low range)
        wickTop: high,
        wickBottom: low,
        wickRange: high - low,
      };
    });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No valid OHLC data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length && payload[0].payload) {
      try {
        const data = payload[0].payload;
        const open = data.open ?? 0;
        const high = data.high ?? 0;
        const low = data.low ?? 0;
        const close = data.close ?? 0;
        return (
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            <p className="font-semibold text-gray-900 mb-2">{data.Date || "N/A"}</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-600">Open:</span> <span className="font-medium text-blue-600">PKR {open.toFixed(2)}</span></p>
              <p><span className="text-gray-600">High:</span> <span className="font-medium text-green-600">PKR {high.toFixed(2)}</span></p>
              <p><span className="text-gray-600">Low:</span> <span className="font-medium text-red-600">PKR {low.toFixed(2)}</span></p>
              <p><span className="text-gray-600">Close:</span> <span className="font-medium text-indigo-600">PKR {close.toFixed(2)}</span></p>
              <p className="mt-2 pt-2 border-t">
                <span className="text-gray-600">Change:</span>{" "}
                <span className={`font-medium ${data.isUp ? "text-green-600" : "text-red-600"}`}>
                  {data.isUp ? "↑" : "↓"} PKR {Math.abs(close - open).toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        );
      } catch (err) {
        console.error("Tooltip error:", err);
        return null;
      }
    }
    return null;
  };

  // Create a visual candlestick chart using OHLC lines
  // This shows all four values clearly
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
        <XAxis
          dataKey="Date"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          stroke="#9ca3af"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          stroke="#9ca3af"
          domain={['dataMin', 'dataMax']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ paddingTop: "10px" }}
          iconType="line"
        />
        
        {/* Show OHLC as distinct lines - clear visualization of all four values */}
        <Line
          type="monotone"
          dataKey="high"
          stroke="#10b981"
          strokeWidth={1.5}
          dot={false}
          name="High"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="low"
          stroke="#ef4444"
          strokeWidth={1.5}
          dot={false}
          name="Low"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="open"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Open"
          strokeDasharray="5 5"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke="#4f46e5"
          strokeWidth={2.5}
          dot={false}
          name="Close"
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default CandlestickChart;
