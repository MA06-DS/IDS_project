import { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader.jsx";
import { fetchDataset, fetchMetrics } from "../services/api.js";

function About() {
  const [metrics, setMetrics] = useState(null);
  const [datasetMeta, setDatasetMeta] = useState({ rows: 0, stocks: 0, dateRange: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [metricsRes, datasetRes] = await Promise.all([fetchMetrics(), fetchDataset()]);
        setMetrics(metricsRes);
        if (datasetRes.length > 0) {
          const dates = datasetRes.map((row) => new Date(row.Date));
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          const nameCount = new Set(datasetRes.map((row) => row.Name)).size;
          setDatasetMeta({
            rows: datasetRes.length,
            stocks: nameCount,
            dateRange: `${minDate.toISOString().slice(0, 10)} → ${maxDate.toISOString().slice(0, 10)}`
          });
        } else {
          setDatasetMeta({ rows: 0, stocks: 0, dateRange: "N/A" });
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load about data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const modelDetails = useMemo(
    () => [
      { label: "Algorithm", value: "RandomForestRegressor (100 trees, random_state=42)" },
      { label: "Features", value: "Date timestamp, OHLC, Volume, Name (LabelEncoder), Close lag 1-3" },
      { label: "Targets", value: "Daily Close price per PSX script" },
      { label: "Origin", value: "Trained via file.py using dataset.csv" }
    ],
    []
  );

  if (loading) return <Loader label="Loading details..." />;
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
        <h2 className="text-2xl font-semibold text-gray-900">About the IDS Dashboard</h2>
        <p className="mt-2 text-sm text-gray-600">
          This interactive dashboard brings together PSX historical data, a trained RandomForestRegressor, and FastAPI
          services to power intelligence, visualization, and rapid predictions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Model Performance</h3>
          <p className="text-sm text-gray-500">Evaluated on the lagged dataset used for training.</p>
          <dl className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <dt>MSE</dt>
              <dd className="font-semibold text-primary-600">{metrics?.mse.toFixed(3)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>R² Score</dt>
              <dd className="font-semibold text-primary-600">{metrics?.r2.toFixed(3)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Dataset Summary</h3>
          <p className="text-sm text-gray-500">Source: dataset.csv bundled with this project.</p>
          <dl className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <dt>Total Rows</dt>
              <dd className="font-semibold">{datasetMeta.rows.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Unique Stocks</dt>
              <dd className="font-semibold">{datasetMeta.stocks}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Date Range</dt>
              <dd className="font-semibold">{datasetMeta.dateRange}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Prediction Logic</h3>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-gray-600">
          <li>Incoming requests convert Date fields to epoch seconds, matching the training features.</li>
          <li>LabelEncoder (`labelencoder_name.pkl`) converts stock names to numeric encodings.</li>
          <li>Lag features (closeₜ₋₁ ... closeₜ₋₃) are sourced from the dataset or recent predictions to preserve continuity.</li>
          <li>The serialized RandomForestRegressor (`model.pkl`) outputs the close estimate, surfaced via FastAPI.</li>
        </ul>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Model Metadata</h3>
        <dl className="mt-4 space-y-2 text-sm text-gray-600">
          {modelDetails.map((item) => (
            <div key={item.label}>
              <dt className="font-semibold text-gray-800">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default About;

