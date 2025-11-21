import pandas as pd
import pickle
import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

df = pd.read_csv("dataset.csv")
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]  # remove unnamed columns
df["Date"] = pd.to_datetime(df["Date"])
df["Date"] = df["Date"].astype("int64") // 10**9

# Encode Name
le = LabelEncoder()
df["Name"] = le.fit_transform(df["Name"])

print(df.head())
n_lags = 3  # use previous 3 days Close
for lag in range(1, n_lags + 1):
    df[f"Close_lag{lag}"] = df["Close"].shift(lag)

# Drop rows with NaN after creating lags
df = df.dropna()

# Features and target
feature_cols = ["Date", "Open", "High", "Low", "Volume", "Name"] + [f"Close_lag{i}" for i in range(1, n_lags + 1)]
X = df[feature_cols].astype(float)
y = df["Close"].astype(float)

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False
)

# Random Forest Regressor
rf = RandomForestRegressor(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)

print("MSE:", mean_squared_error(y_test, y_pred))
print("R2:", r2_score(y_test, y_pred))

print(pd.DataFrame({
    "Actual": y_test.values,
    "Predicted": y_pred
}).head(10))

with open("model.pkl", "wb") as f:
    pickle.dump(rf, f)

# Save label encoder for Name column (needed when using the model later)
with open("labelencoder_name.pkl", "wb") as f:
    pickle.dump(le, f)

print("Model and encoder saved successfully.")