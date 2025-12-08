import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Charts from "./pages/Charts.jsx";
import Predictor from "./pages/Predictor.jsx";
import Dataset from "./pages/Dataset.jsx";
import About from "./pages/About.jsx";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="charts" element={<Charts />} />
        <Route path="predictor" element={<Predictor />} />
        <Route path="dataset" element={<Dataset />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;

