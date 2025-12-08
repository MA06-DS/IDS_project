# PSX Prediction Application

[![React](https://img.shields.io/badge/React-18.0-blue?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple?logo=vite)](https://vitejs.dev)
[![Flask](https://img.shields.io/badge/Flask-3.0-green?logo=flask)](https://flask.palletsprojects.com)
[![Python](https://img.shields.io/badge/Python-3.8+-blue?logo=python)](https://www.python.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?logo=tailwindcss)](https://tailwindcss.com)

> A machine-learning powered full-stack application that predicts Pakistan Stock Exchange (PSX) stock trends using a **React + Vite** frontend and a **Flask** backend. Includes interactive charts, prediction tools, dataset viewing, and a modern UI.

## 🚀 Frontend (React + Vite + Tailwind)

### React
- **Component-Based Architecture**
  - Builds UI using reusable components (charts, cards, forms).
- **State Management**
  - Efficient state handling using `useState`, `useEffect` hooks.

### Vite
- **Lightning-Fast Dev Server**
  - Instant Hot Module Replacement (HMR) for rapid development.
- **Optimized Builds**
  - Automatic code splitting and optimized production bundles.

### Tailwind CSS
- **Utility-First Styling**
  - Fast styling via classes like `flex`, `p-4`, `bg-gray-100`.
- **Responsive Design**
  - Ensures clean, consistent UI across all devices.

### Recharts
- **Interactive Visualizations**
  - Candlestick charts for OHLC data visualization.
  - Line charts for trend analysis and historical data.
  - Tooltip and legend support for better UX.

### React Router
- **Page Navigation**
  - Routes: Dashboard, Charts, Predictor, Dataset, About.
  - Seamless client-side routing without page reloads.

---

## 🧠 Backend (Flask + ML Model)

- **Flask**
  - Lightweight Python web framework that serves API endpoints.
  - RESTful API design for clean integration with frontend.
    
- **Machine Learning Model `model.pkl`**
  - Pre-trained model used to generate future price predictions.
  - Loaded via utility functions for efficient inference.

- **Flask-CORS**
  - Enables cross-origin requests from the Vite dev server.
  - Prevents CORS blocking during development and production.
    
- **Custom API Routes**
  - Organized routes in separate modules: `predict.py`, `charts.py`, `dataset.py`, `dashboard.py`.
  - Modular structure for maintainability and scalability.
    
- **Logging**
  - Backend logs stored at: `logs/flask_app.log`.
  - Tracks requests, errors, and predictions for debugging and monitoring.

---

## ▶️ How to Run the Project

### Prerequisites
- **Node.js** v16.0 or higher
- **Python** 3.8 or higher
- **pip** (Python package manager)
- **Git**

### 1️⃣ Start Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Backend runs at:** 👉 `http://localhost:5000`

### 2️⃣ Start Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

**Frontend runs at:** 👉 `http://localhost:5173`

---

## 📡 API Endpoints

### REST API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stock/<symbol>` | Fetch current stock information |
| `GET` | `/api/historical/<symbol>` | Retrieve historical stock data |
| `POST` | `/api/predict` | Predict future stock prices |
| `GET` | `/api/dataset` | Get dataset overview and statistics |
| `GET` | `/api/dashboard/metrics` | Fetch dashboard summary metrics |

### Example Requests

**Get Stock Data:**
```bash
curl http://localhost:5000/api/stock/PPL
```

**Predict Future Prices:**
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "PPL", "days": 30}'
```

---

## 📊 Frontend Pages

### Dashboard
- Summary metrics and key statistics
- Quick overview charts
- Real-time market data
- Performance indicators

### Charts
- Interactive candlestick graphs
- Trend visualizations
- Historical price movements
- Technical analysis tools

### Predictor
- Input number of days for prediction
- ML model prediction output
- Confidence intervals
- Trend forecasting visualization

### Dataset
- View dataset loaded into backend
- Data statistics and distribution
- Downloadable data export
- Data quality metrics

### About
- Application overview and description
- Technology stack information
- Team and contact details
- Project documentation links

---

## 📁 Project Structure

```
psx-prediction/
│
├── backend/                          # Flask server + prediction API
│   ├── app.py                        # Main Flask entry point
│   ├── requirements.txt              # Python dependencies
│   ├── model.pkl                     # Trained ML model
│   ├── model_metrics.json            # Model performance data
│   ├── dataset.csv                   # Training dataset
│   │
│   ├── routes/                       # API route modules
│   │   ├── predict.py                # Prediction endpoints
│   │   ├── charts.py                 # Chart data endpoints
│   │   ├── dataset.py                # Dataset viewing endpoints
│   │   └── dashboard.py              # Dashboard metrics endpoints
│   │
│   ├── utils/                        # Utility functions
│   │   ├── model_loader.py           # ML model loading
│   │   └── preprocessor.py           # Data preprocessing
│   │
│   └── logs/
│       └── flask_app.log             # Application logs
│
├── frontend/                         # React + Vite + Tailwind UI
│   ├── index.html                    # Main HTML entry point
│   ├── package.json                  # NPM dependencies
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # Tailwind CSS customization
│   │
│   ├── src/
│   │   ├── App.jsx                   # Root React component
│   │   ├── index.css                 # Global styles
│   │   │
│   │   ├── components/               # Reusable UI components
│   │   │   ├── Charts.jsx
│   │   │   ├── Cards.jsx
│   │   │   ├── Tables.jsx
│   │   │   ├── Forms.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Navigation.jsx
│   │   │
│   │   ├── pages/                    # Page-level components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Charts.jsx
│   │   │   ├── Predictor.jsx
│   │   │   ├── Dataset.jsx
│   │   │   └── About.jsx
│   │   │
│   │   └── services/
│   │       └── api.js                # API client and endpoints
│   │
│   └── public/                       # Static assets
│
├── README.md                         # This file
├── LICENSE                           # License file
└── dataset.csv                       # Main dataset file
```


## 🐛 Troubleshooting

### Backend Issues

- **Port 5000 already in use**
  - Change the port in `app.py` or kill the process using port 5000.
- **Module not found**
  - Ensure all dependencies are installed: `pip install -r requirements.txt`.
- **Model loading error**
  - Verify `model.pkl` exists in the backend directory.
- **CORS errors**
  - Check Flask-CORS is installed and enabled in `app.py`.


### Frontend Issues

- **CORS errors when calling API**
  - Ensure Flask backend is running with CORS enabled.
- **Blank page after build**
  - Clear browser cache and restart the dev server.
- **Port 5173 already in use**
  - Vite will automatically use the next available port.
- **API requests timing out**
  - Check backend is running and responding at `http://localhost:5000`.

---

## 📈 Performance Tips

- Monitor network requests using browser DevTools
- Use production builds for deployment: `npm run build`
- Implement caching strategies for frequently accessed data
- Monitor Flask logs for slow queries or API bottlenecks
- Consider implementing pagination for large datasets

---

## 📝 License

This project is provided as-is for educational and development purposes.

---

## 📧 Support & Feedback

For issues, suggestions, or contributions, please open an issue in the project repository or contact the development team.

---

**Happy Predicting! 📊✨**
