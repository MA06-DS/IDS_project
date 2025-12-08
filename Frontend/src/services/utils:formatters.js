import dayjs from "dayjs";

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2
  }).format(value);
};

export const formatNumber = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(value);
};

export const formatDate = (value) => {
  if (!value) return "—";
  return dayjs(value).format("YYYY-MM-DD");
};

export const movingAverage = (data, windowSize, field = "Close") => {
  return data.map((_, index, array) => {
    if (index + 1 < windowSize) return null;
    const window = array.slice(index + 1 - windowSize, index + 1);
    const sum = window.reduce((acc, row) => acc + (Number(row[field]) || 0), 0);
    return sum / windowSize;
  });
};

