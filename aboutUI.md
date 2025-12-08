PSX Prediction Application

A machine-learning powered web application that predicts Pakistan Stock Exchange (PSX) stock trends using a React + Vite frontend and a Flask backend.
React

Used to build the user interface.

Helps create reusable components (charts, forms, cards).

Handles state efficiently using hooks like useState and useEffect.

Vite

Development server + fast build tool.

Much faster than Webpack/CRA.

Provides instant hot reload and optimized production builds.

Tailwind CSS

Utility-first CSS framework.

Enables fast styling with classes like flex, p-4, bg-gray-100.

Ensures responsive and clean UI design.

Recharts

React charting library.

Used for line charts, candlestick charts, and stock trend visuals.

Lucide Icons

Lightweight icon pack.

Adds clean, modern icons to dashboard elements and buttons.

React Router

Handles navigation between pages:

Dashboard

Charts

Predictor

Dataset

About

🧠 Backend
Flask

Python backend framework.

Handles all API requests from the frontend.

Serves prediction, dataset, and chart endpoints.

Machine Learning Model (model.pkl)

Predicts future stock prices using trained ML algorithms.

Loaded using backend utilities.

Pandas / NumPy

Used for data processing, cleaning, transformations.

Flask-CORS

Allows Vite (frontend) to talk to Flask (backend).

Prevents cross-origin request issues.

Custom API Routes

Organized into separate files for clarity:

predict.py

charts.py

dataset.py

dashboard.py

Logging

Logs stored in:

logs/flask_app.log


Helps debugging backend behavior.

▶️ How to Run the Project
1️⃣ Backend Setup
cd backend
pip install -r requirements.txt
python app.py


Backend runs on:
👉 http://localhost:5000

2️⃣ Frontend Setup
cd frontend
npm install
npm run dev


Frontend runs on:
👉 http://localhost:5173

📡 API Endpoints
Method	Endpoint	Description
GET	/api/stock/<symbol>	Get current stock info
GET	/api/historical/<symbol>	Get historical price data
POST	/api/predict	Predict future stock prices
📊 Frontend Pages

Dashboard – Quick metrics + summary charts

Charts – Candlestick + trend visualizations

Predictor – Enter number of days → get ML prediction

Dataset – View dataset loaded into backend

About – Application overview

📁 Project Structure
IDS-Project/
│
├── backend/               # Flask server + prediction API
│   ├── app.py             # Main entry point
│   ├── model.pkl          # Trained ML model
│   ├── model_metrics.json # Model performance data
│   ├── dataset.csv        # Training dataset
│   ├── routes/            # API route files
│   └── utils/             # Preprocessing + model loading
│
├── frontend/              # React + Vite + Tailwind UI
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/    # Charts, cards, tables, layout
│   │   ├── pages/         # Dashboard, charts, dataset, predictor, about
│   │   └── services/api.js
│   └── tailwind.config.js
│
├── UI-Output.pdf          # UI snapshot/output
└── dataset.csv

🎯 About This Project

A full-stack application that predicts PSX (Pakistan Stock Exchange) stock prices using machine learning.
Features include interactive charts, prediction tools, dataset viewer, and a fast, modern UI built with React + Vite + Tailwind.
