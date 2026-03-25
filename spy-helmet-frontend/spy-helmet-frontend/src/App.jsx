import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import AdvancedDashboard from "./AdvancedDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/advanced" element={<AdvancedDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

