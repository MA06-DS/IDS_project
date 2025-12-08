import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Helper to extract data from backend response format
const extractData = (response) => {
  if (response.data && response.data.success !== undefined) {
    return response.data;
  }
  return response.data;
};

/**
 * Dashboard API
 */
export const fetchMetrics = async () => {
  try {
    const response = await apiClient.get("/dashboard");
    const data = extractData(response);
    
    // Transform backend response to match frontend expectations
    // Backend returns: { success: true, summary: { model_metrics: { mse: number|null, r2: number|null }, ... } }
    if (data && data.summary && data.summary.model_metrics) {
      const metrics = data.summary.model_metrics;
      // Preserve null values (don't convert to 0) so UI can show "—" when metrics aren't available
      return {
        mse: metrics.mse !== null && metrics.mse !== undefined ? metrics.mse : null,
        r2: metrics.r2 !== null && metrics.r2 !== undefined ? metrics.r2 : null,
        total_records: data.summary.total_records || 0,
        total_stocks: data.summary.total_stocks || 0
      };
    }
    
    // If structure is different, try to extract directly
    if (data && data.model_metrics) {
      return {
        mse: data.model_metrics.mse !== null && data.model_metrics.mse !== undefined ? data.model_metrics.mse : null,
        r2: data.model_metrics.r2 !== null && data.model_metrics.r2 !== undefined ? data.model_metrics.r2 : null,
        total_records: data.total_records || 0,
        total_stocks: data.total_stocks || 0
      };
    }
    
    console.warn("Unexpected dashboard response structure:", data);
    return {
      mse: null,
      r2: null,
      total_records: 0,
      total_stocks: 0
    };
  } catch (error) {
    console.error("Error fetching metrics:", error);
    throw error;
  }
};

export const fetchDashboardSummary = async () => {
  try {
    const response = await apiClient.get("/dashboard");
    return extractData(response);
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    throw error;
  }
};

export const fetchRecentData = async () => {
  try {
    const response = await apiClient.get("/dashboard/recent");
    const data = extractData(response);
    return data.recent_data || [];
  } catch (error) {
    console.error("Error fetching recent data:", error);
    throw error;
  }
};

/**
 * Dataset API
 * Supports legacy signature (page, perPage) for backwards compatibility
 * and object-based signature with filters.
 */
export const fetchDataset = async (pageOrOptions = 1, perPageArg = 50) => {
  try {
    let params = {};
    let returnFullPayload = false;

    if (typeof pageOrOptions === "object") {
      const {
        page = 1,
        perPage = 50,
        symbol,
        search,
        startDate,
        endDate
      } = pageOrOptions || {};

      params = {
        page,
        per_page: perPage
      };

      if (symbol && symbol !== "All") params.symbol = symbol;
      if (search) params.search = search;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      returnFullPayload = true;
    } else {
      params = {
        page: pageOrOptions ?? 1,
        per_page: perPageArg ?? 50
      };
    }

    const response = await apiClient.get("/dataset", { params });
    const data = extractData(response);
    const payload = {
      data: data.data || [],
      pagination: data.pagination || null
    };

    return returnFullPayload ? payload : payload.data;
  } catch (error) {
    console.error("Error fetching dataset:", error);
    throw error;
  }
};

/**
 * Charts API
 */
export const fetchChartData = async (symbol = null, limit = 100) => {
  try {
    if (symbol) {
      const response = await apiClient.get(`/charts/${symbol}`, {
        params: { limit }
      });
      const data = extractData(response);
      return data.data || [];
    } else {
      const response = await apiClient.get("/charts", {
        params: { limit }
      });
      const data = extractData(response);
      return data.data || [];
    }
  } catch (error) {
    console.error("Error fetching chart data:", error);
    throw error;
  }
};

/**
 * Prediction API
 */
export const submitPrediction = async (payload) => {
  try {
    // Transform frontend payload to backend format
    const backendPayload = {
      symbol: payload.Name || payload.symbol,
      open: parseFloat(payload.Open),
      high: parseFloat(payload.High),
      low: parseFloat(payload.Low),
      volume: parseFloat(payload.Volume)
    };
    
    // Include date if provided (needed for lag feature calculation)
    if (payload.Date) {
      backendPayload.date = payload.Date;
    }
    
    // Only include close if provided (it's optional since we're predicting it)
    if (payload.Close !== undefined && payload.Close !== null && payload.Close !== '') {
      backendPayload.close = parseFloat(payload.Close);
    }
    
    const response = await apiClient.post("/predict", backendPayload);
    const data = extractData(response);
    
    // Transform backend response to match frontend expectations
    if (data.success && data.prediction) {
      return {
        predicted_close: data.prediction,
        name: data.symbol,
        used_lags: data.input_features || {}
      };
    }
    return data;
  } catch (error) {
    console.error("Error submitting prediction:", error);
    throw error;
  }
};

/**
 * Stocks API
 */
export const fetchStocks = async () => {
  try {
    const response = await apiClient.get("/stocks");
    const data = extractData(response);
    return data.stocks || [];
  } catch (error) {
    console.error("Error fetching stocks:", error);
    throw error;
  }
};

/**
 * Legacy API functions for backward compatibility
 */
export const fetchHistory = async (limit = 10) => {
  // Backend doesn't have a history endpoint, so we'll use recent data
  try {
    const recent = await fetchRecentData();
    return recent.slice(0, limit);
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

export const fetchTodayPrediction = async () => {
  try {
    const history = await fetchHistory(1);
    return history[0] || null;
  } catch (error) {
    console.error("Error fetching today's prediction:", error);
    return null;
  }
};

export const fetchNames = async () => {
  try {
    const stocks = await fetchStocks();
    return stocks.sort();
  } catch (error) {
    console.error("Error fetching names:", error);
    // Fallback: try to get names from dataset
    try {
      const dataset = await fetchDataset(1, 1000);
      const names = Array.from(new Set(dataset.map((row) => row.Name || row.name))).filter(Boolean);
      return names.sort();
    } catch (e) {
      return [];
    }
  }
};

/**
 * Fetch stock data (Open, Close, etc.) for a given date and symbol
 */
export const fetchStockData = async (symbol, date) => {
  try {
    const response = await apiClient.post("/predict/fetch-data", {
      symbol: symbol,
      date: date
    });
    const data = extractData(response);
    return data.data || null;
  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw error;
  }
};

/**
 * Fetch stock price changes for slideshow
 */
export const fetchStockChanges = async () => {
  try {
    const response = await apiClient.get("/dashboard/stock-changes");
    const data = extractData(response);
    return data.stocks || [];
  } catch (error) {
    console.error("Error fetching stock changes:", error);
    throw error;
  }
};

export default apiClient;
