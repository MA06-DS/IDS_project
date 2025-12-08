# PSX Prediction Application

A machine-learning powered full-stack app that predicts Pakistan Stock Exchange (PSX) stock trends using a **React + Vite** frontend and a **Flask** backend.  
Features interactive charts, prediction tools, dataset viewer, and a modern responsive UI.

---

## Screenshot
> Replace the image path below with your actual screenshot file (e.g. `./UI-Output.png` or `./assets/screenshot.png`).

![UI Preview](./UI-Output.png)

---

## Frontend (What & Why)

- **React**  
  - Builds the UI with reusable components (charts, forms, cards).  
  - State management via hooks (`useState`, `useEffect`).

- **Vite**  
  - Fast dev server & build tool with instant HMR.  
  - Much faster than CRA/Webpack in dev mode.

- **Tailwind CSS**  
  - Utility-first styling for rapid, consistent UI design (`flex`, `p-4`, etc.).

- **Recharts**  
  - React charting library — used for line & candlestick charts and trend visuals.

- **Lucide Icons**  
  - Lightweight icon pack for clean dashboard icons.

- **React Router**  
  - Page navigation for: Dashboard, Charts, Predictor, Dataset, About.

---

## Backend (What & Why)

- **Flask**  
  - Lightweight Python web framework that serves API endpoints.

- **Machine Learning Model (`model.pkl`)**  
  - Pre-trained model used to generate future price predictions.

- **Pandas / NumPy**  
  - Data processing and transformations.

- **Flask-CORS**  
  - Enables cross-origin requests from the Vite dev server.

- **Custom API Routes**  
  - Organized routes: `predict.py`, `charts.py`, `dataset.py`, `dashboard.py`.

- **Logging**  
  - Backend logs: `logs/flask_app.log` for debugging and monitoring.

---

## How to Run

### 1) Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
