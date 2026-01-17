import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [helmetId, setHelmetId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("readOnly");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
          role: role
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("email", email);
        setMessage("✅ Login successful!");

        // 🚨 TEST SCRIPT: Automatically send dummy sensor data on login (For Demo)
        // This simulates an ESP32 sending data every 100ms for ~20 seconds.
        let packetCount = 0;
        const maxPackets = 200; // Run for 20 seconds

        console.log("🚀 Starting Sensor Simulation...");

        const simulationInterval = setInterval(() => {
          if (packetCount >= maxPackets) {
            clearInterval(simulationInterval);
            console.log("✅ Simulation Complete");
            return;
          }

          packetCount++;

          // Generate randomized realistic values
          const dummyPayload = {
            helmet_ID: "demo-helmet-123",
            BodyTemp: 36.5 + Math.random(), // 36.5 - 37.5
            EnvTemp: 28.0 + Math.random() * 2,
            Humidity: 45 + Math.random() * 5,
            CO_ppm: Math.random() * 3,
            CH4_ppm: Math.random(),
            HR: 70 + Math.floor(Math.random() * 30), // 70 - 100 BPM
            SpO2: 96 + Math.floor(Math.random() * 4),
            Packet_no: packetCount
          };

          fetch(`${API_URL}/submit_reading`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dummyPayload)
          }).catch(e => console.error("Sim error:", e));

        }, 100); // Send every 100ms

        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setMessage(`❌ Error: ${data.detail || "Login failed"}`);
      }
    } catch (err) {
      console.log(err);
      setMessage("CROSS(in red color) Taihenda!!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>

        <input
          type="text"
          placeholder="User ID"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-6 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <div className="mb-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-700"
          >
            <option value="readOnly">readOnly</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
        >
          Login
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}

export default Login;