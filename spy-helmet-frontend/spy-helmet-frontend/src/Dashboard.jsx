import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

export default function Dashboard() {
  const [prediction, setPrediction] = useState("--");
  const [probability, setProbability] = useState("N/A");
  const [rawScores, setRawScores] = useState([0, 0, 0]);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardColor, setCardColor] = useState("bg-gray-900");
  const [heartRate, setHeartRate] = useState("--");
  const [bodyTemp, setBodyTemp] = useState("--");
  const [ch4, setCH4] = useState("--");
  const [co, setCO] = useState("--");
  const [fatigueAlert, setFatigueAlert] = useState(false);
  const [sensorAlert, setSensorAlert] = useState(false);
  const [rprogress, setrprogress] = useState("");
  const COLORS = ["#34D399", "#FBBF24", "#EF4444"];

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/live_predict`);
        const data = res.data;

        if (data.status === "collecting") {
          setLoading(true);
          setrprogress(data.reading_progress);
          return;
        }

        const now = Date.now();
        const raw = data.raw_scores || [0, 0, 0];
        const prob = Math.max(...raw) * 100;
        const hr = data.heart_rate ?? 0;
        const rprogress = 0;

        setPrediction(data.prediction);
        setrprogress(data.reading_progress);
        setRawScores(raw);
        setProbability(prob.toFixed(2));
        setHeartRate(hr ? hr.toFixed(1) : "--");
        setBodyTemp(data.body_temp?.toFixed(1) || "--");
        setCH4(data.ch4_ppm?.toFixed(1) || "--");
        setCO(data.co_ppm?.toFixed(1) || "--");
        setLoading(false);
        setrprogress(false);

        // 🟩 Color animation logic
        setCardColor(
          prob >= 90
            ? "bg-green-900 border-green-600 animate-pulse"
            : prob >= 50
              ? "bg-yellow-900 border-yellow-600 animate-pulse"
              : "bg-red-900 border-red-600 animate-pulse"
        );

        // 🟥 Fatigue Alert
        setFatigueAlert(data.prediction === "Fatigue" && prob >= 80);

        // 🟨 Sensor Alert (Heart rate 0)
        setSensorAlert(hr === 0);

        // 🧮 Chart Data
        setChartData((prevData) => {
          const newData = [
            ...prevData,
            {
              time: now,
              probability: prob,
              fatigue: raw[2] * 100,
              stress: raw[1] * 100,
              normal: raw[0] * 100
            }
          ];
          return newData.filter((d) => now - d.time <= 120000);
        });

        // 🥧 Pie Chart
        const sum = raw.reduce((a, b) => a + b, 0);
        const pieReady = sum > 0;
        setPieData(
          pieReady
            ? [
              { name: "Normal", value: raw[0] * 100 },
              { name: "Stressed", value: raw[1] * 100 },
              { name: "Fatigue", value: raw[2] * 100 }
            ]
            : []
        );
      } catch (err) {
        console.error("Error fetching prediction:", err);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">

      {/* 🟥 Fatigue Alert */}
      {fatigueAlert && (
        <div className="fixed inset-0 bg-red-800/80 z-50 flex items-center justify-center animate-pulse backdrop-blur-sm transition-all duration-500 ease-in-out">
          <h1 className="text-white text-5xl font-extrabold animate-bounce drop-shadow-lg">
            ⚠️ FATIGUE DETECTED!
          </h1>
        </div>
      )}

      {/* 🟨 Sensor Disconnect Alert */}
      {sensorAlert && (
        <div className="fixed inset-0 flex items-center justify-center bg-yellow-700/20 backdrop-blur-sm border border-yellow-400 shadow-[0_0_25px_5px_rgba(255,255,0,0.5)] animate-pulse z-40">
          <div className="text-center">
            <h1 className="text-yellow-300 text-5xl font-extrabold tracking-wide animate-bounce drop-shadow-md">
              WEAR THE HELMET
            </h1>
          </div>
        </div>
      )}

      {/* 🧠 Title */}
      <h1 className="text-4xl font-extrabold text-center text-cyan-400 tracking-wide animate-fade-in">
        <span role="img" aria-label="helmet">🛡</span> SPY HELMET DASHBOARD
      </h1>
      <p className="text-center text-gray-400 mt-1 mb-4">Live Prediction</p>

      {/* 🌀 Loader */}
      {loading ? (
        <div className="flex justify-center items-center h-96">
          <p className="text-cyan-300 text-xl font-semibold animate-pulse">
            Data is loading from sensors...
          </p>
          <p className="text-cyan-300 text-xl font-semibold animate-pulse">
            {rprogress}
          </p>
        </div>
      ) : (
        <>
          {/* 🧾 Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-cyan-700 shadow-md rounded-xl p-4 animate-fade-in">
              <p className="text-md text-gray-300 mb-1">Prediction</p>
              <p className="text-3xl font-bold text-cyan-300 animate-pulse">{prediction}</p>
            </div>

            <div className={`${cardColor} border shadow-md rounded-xl p-4 transition-all duration-300 animate-fade-in`}>
              <p className="text-md text-gray-300 mb-1">Probability</p>
              <p className="text-3xl font-bold text-green-400">{probability}%</p>
            </div>

            <div className="bg-gray-900 border border-yellow-600 shadow-md rounded-xl p-4 overflow-x-auto animate-fade-in">
              <p className="text-md text-gray-300 mb-1">Raw Scores</p>
              <pre className="text-yellow-300 text-sm">
                {JSON.stringify(rawScores, null, 2)}
              </pre>
            </div>
          </div>

          {/* 📈 Charts */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-cyan-800 p-4 rounded-xl shadow animate-fade-in">
              <h2 className="text-center text-cyan-400 text-lg font-semibold mb-2">
                Probability Trend (Bar Chart)
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.map(d => ({ ...d, time: new Date(d.time).toLocaleTimeString() }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="time" stroke="#aaa" />
                  <YAxis stroke="#aaa" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#222", border: "none" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value) => [`${parseFloat(value || 0).toFixed(2)}%`, "probability"]}
                  />
                  <Bar dataKey="probability" fill="#00FFFF" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 border border-pink-700 p-4 rounded-xl shadow animate-fade-in">
              <h2 className="text-center text-pink-400 text-lg font-semibold mb-2">
                Sensor Readings
              </h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-gray-800 rounded-xl border border-green-500">
                  <p className="text-sm text-gray-300">Heart Rate</p>
                  <p className="text-2xl font-bold text-green-400">{heartRate} bpm</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl border border-blue-500">
                  <p className="text-sm text-gray-300">Body Temp</p>
                  <p className="text-2xl font-bold text-blue-400">{bodyTemp}°C</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl border border-yellow-500">
                  <p className="text-sm text-gray-300">CH₄ (Methane)</p>
                  <p className="text-2xl font-bold text-yellow-300">{ch4} ppm</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl border border-red-500">
                  <p className="text-sm text-gray-300">CO (Carbon Monoxide)</p>
                  <p className="text-2xl font-bold text-red-400">{co} ppm</p>
                </div>
              </div>
            </div>
          </div>

          {/* 🧩 Pie Chart */}
          <div className="mt-6 bg-gray-900 border border-cyan-800 p-4 rounded-xl shadow animate-fade-in">
            <h2 className="text-center text-cyan-400 text-lg font-semibold mb-2">
              State Distribution
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
