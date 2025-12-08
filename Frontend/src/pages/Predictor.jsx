import { useEffect, useState } from "react";
import PredictForm from "../components/PredictForm.jsx";
import Table from "../components/Table.jsx";
import Loader from "../components/Loader.jsx";
import { fetchHistory, fetchNames, submitPrediction } from "../services/api.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

function Predictor() {
  const [names, setNames] = useState([]);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [namesRes, historyRes] = await Promise.all([fetchNames(), fetchHistory(10)]);
        setNames(namesRes);
        setHistory(historyRes);
      } catch (err) {
        console.error(err);
        setError("Unable to load predictor data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (values, resetForm) => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = {
        Date: new Date(values.Date).toISOString(),
        Open: parseFloat(values.Open),
        High: parseFloat(values.High),
        Low: parseFloat(values.Low),
        Close: parseFloat(values.Close || 0), // Close might not be provided
        Volume: parseFloat(values.Volume),
        Name: values.Name
      };
      
      // Validate required fields
      if (!payload.Open || !payload.High || !payload.Low || !payload.Volume) {
        setError("Please fetch data or fill in all required fields (Open, High, Low, Volume)");
        setSubmitting(false);
        return;
      }
      
      const response = await submitPrediction(payload);
      setResult(response);
      setSuccess("Prediction generated successfully.");
      resetForm();
      const updatedHistory = await fetchHistory(10);
      setHistory(updatedHistory);
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Prediction failed. Please verify inputs.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "Date", title: "Date", render: (value) => formatDate(value) },
    { key: "Name", title: "Name" },
    { key: "Close", title: "Close Price", render: (value) => formatCurrency(value) },
    { key: "Volume", title: "Volume", render: (value) => value ? Number(value).toLocaleString() : "—" }
  ];

  if (loading) return <Loader label="Preparing predictor..." />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Predict Close Price</h2>
        <p className="text-sm text-gray-500">
          Provide today&apos;s market inputs to estimate the next close price for a PSX script.
        </p>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600">{success}</p>}

        <div className="mt-6">
          <PredictForm names={names} onSubmit={handleSubmit} isSubmitting={submitting} />
        </div>

        {result && (
          <div className="mt-6 rounded-xl bg-primary-50 p-4 text-primary-700">
            <p className="text-sm uppercase tracking-wide text-primary-400">Predicted Close</p>
            <p className="text-3xl font-semibold">{formatCurrency(result.predicted_close)}</p>
            <p className="text-sm text-primary-500">
              Using lag values:{" "}
              {Object.entries(result.used_lags)
                .map(([key, value]) => `${key}: ${formatCurrency(value)}`)
                .join(", ")}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Predictions</h3>
          <p className="text-sm text-gray-500">Last 10 submissions</p>
        </div>
        <Table columns={columns} data={history} />
      </div>
    </div>
  );
}

export default Predictor;

