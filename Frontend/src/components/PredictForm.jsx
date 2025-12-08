import { useState, useEffect } from "react";
import { fetchStockData } from "../services/api.js";

const initialState = {
  Date: "",
  Name: ""
};

function PredictForm({ names, onSubmit, isSubmitting }) {
  const [formValues, setFormValues] = useState(initialState);
  const [stockData, setStockData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setDataError("");
    setStockData(null);
  };

  // Auto-fetch data when both Date and Name are selected
  useEffect(() => {
    const fetchData = async () => {
      if (!formValues.Date || !formValues.Name) {
        setStockData(null);
        return;
      }

      setLoadingData(true);
      setDataError("");
      try {
        const data = await fetchStockData(formValues.Name, formValues.Date);
        if (data) {
          setStockData(data);
        } else {
          setDataError("No data found for selected date and stock");
        }
      } catch (err) {
        setDataError(err.response?.data?.error || "Failed to fetch stock data. Please try a different date.");
        setStockData(null);
      } finally {
        setLoadingData(false);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchData, 500);
    return () => clearTimeout(timeoutId);
  }, [formValues.Date, formValues.Name]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!onSubmit) return;
    
    // Validate that we have fetched data
    if (!stockData || !formValues.Date || !formValues.Name) {
      setDataError("Please wait for data to be fetched or select a valid date and stock");
      return;
    }
    
    // Submit with fetched data
    const submitValues = {
      ...formValues,
      Open: stockData.open,
      High: stockData.high,
      Low: stockData.low,
      Volume: stockData.volume,
      Close: stockData.close || 0
    };
    
    onSubmit(submitValues, () => {
      setFormValues(initialState);
      setStockData(null);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">
          Date
          <input
            type="date"
            name="Date"
            value={formValues.Date}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm font-medium text-gray-700">
          Stock Name
          <select
            name="Name"
            value={formValues.Name}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            required
          >
            <option value="">Select stock</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadingData && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          🔄 Auto-fetching stock data...
        </div>
      )}

      {dataError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{dataError}</p>
      )}

      {stockData && !loadingData && (
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-semibold text-green-800 mb-2">✅ Data Fetched Successfully</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Open:</span>
              <p className="font-semibold text-gray-900">PKR {stockData.open?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-600">High:</span>
              <p className="font-semibold text-gray-900">PKR {stockData.high?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-600">Low:</span>
              <p className="font-semibold text-gray-900">PKR {stockData.low?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <span className="text-gray-600">Volume:</span>
              <p className="font-semibold text-gray-900">{stockData.volume?.toLocaleString() || "N/A"}</p>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || loadingData || !stockData}
        className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Predicting..." : loadingData ? "Fetching Data..." : !stockData ? "Select Date & Stock" : "Predict Close Price"}
      </button>
    </form>
  );
}

export default PredictForm;

