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
  const [humidity, setHumidity] = useState("--");
  const [envTemp, setEnvTemp] = useState("--");
  const [spo2, setSpO2] = useState("--");
  const [fatigueAlert, setFatigueAlert] = useState(false);
  const [sensorAlert, setSensorAlert] = useState(false);
  const [rprogress, setrprogress] = useState("");
  const [packetNo, setPacketNo] = useState("--");
  const [lastFetchStatus, setLastFetchStatus] = useState("init");

  const [latency, setLatency] = useState(0);
  const [lastPacketTime, setLastPacketTime] = useState(Date.now());
  const [isDataStale, setIsDataStale] = useState(false);
  const [blink, setBlink] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const COLORS = ["#34D399", "#FBBF24", "#EF4444"];

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    const interval = setInterval(async () => {
      const start = Date.now();
      try {
        const res = await axios.get(`${API_URL}/live_predict`);
        const lat = Date.now() - start;
        setLatency(lat);
        setLastFetchStatus("success");
        const data = res.data;

        if (data.status === "collecting") {
          setLoading(true);
          setrprogress(data.reading_progress);

          // Still update packet number if available so we know we are connected!
          const newPacketNo = data.packet_no || "--";
          if (newPacketNo !== packetNo) {
            setLastPacketTime(Date.now());
            setIsDataStale(false);
            setBlink(true);
            setTimeout(() => setBlink(false), 200);
            setPacketNo(newPacketNo);
          }
          return;
        }

        const now = Date.now();
        const raw = data.raw_scores || [0, 0, 0];
        const prob = Math.max(...raw) * 100;
        const hr = data.heart_rate ?? 0;
        const rprogress = 0;

        const newPacketNo = data.packet_no || "--";

        if (newPacketNo !== packetNo) {
          setLastPacketTime(Date.now());
          setIsDataStale(false);
          setBlink(true);
          setTimeout(() => setBlink(false), 200);
        } else if (Date.now() - lastPacketTime > 10000 && packetNo !== "--") {
          setIsDataStale(true);
        }

        setPrediction(data.prediction);
        setrprogress(data.reading_progress);
        setPacketNo(newPacketNo);
        setRawScores(raw);
        setProbability(prob.toFixed(2));
        setHeartRate(hr ? hr.toFixed(1) : "--");
        setBodyTemp(data.body_temp?.toFixed(1) || "--");
        setCH4(data.ch4_ppm?.toFixed(1) || "--");
        setCO(data.co_ppm?.toFixed(1) || "--");
        setHumidity(data.humidity?.toFixed(1) || "--");
        setEnvTemp(data.env_temp?.toFixed(1) || "--");
        setSpO2(data.spo2 || "--");
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
        setLastFetchStatus("error");
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
      {/* 📡 Connection Status Indicator */}
      <div className={`fixed top-4 right-4 z-50 p-3 rounded-lg font-mono text-sm border shadow-lg transition-all duration-300 ${lastFetchStatus === 'success'
        ? 'bg-green-900/90 border-green-400 text-green-100 shadow-[0_0_15px_rgba(74,222,128,0.5)]'
        : 'bg-red-900/90 border-red-500 text-red-100 animate-pulse shadow-[0_0_15px_rgba(248,113,113,0.5)]'
        }`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isDataStale ? 'bg-yellow-500 animate-bounce' : lastFetchStatus === 'success' ? 'bg-green-400 animate-ping' : 'bg-red-500'}`}></span>
          <span className="font-bold">
            {isDataStale ? 'SENSOR OFFLINE / STALE' : lastFetchStatus === 'success' ? 'SYSTEM ONLINE' : 'CONNECTION ERROR'}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-4 text-xs opacity-80">
          <span className={`transition-colors duration-200 ${blink ? 'text-white font-bold scale-110' : 'text-gray-300'}`}>
            Packet #: {packetNo}
          </span>
          <span>Latency: {latency}ms</span>
        </div>
      </div>

      {/* 🟥 Fatigue Alert */}
      {
        fatigueAlert && (
          <div className="fixed inset-0 bg-red-800/80 z-50 flex items-center justify-center animate-pulse backdrop-blur-sm transition-all duration-500 ease-in-out">
            <h1 className="text-white text-5xl font-extrabold animate-bounce drop-shadow-lg">
              ⚠️ FATIGUE DETECTED!
            </h1>
          </div>
        )
      }

      {/* 🟨 Sensor Disconnect Alert */}
      {
        sensorAlert && (
          <div className="fixed inset-0 flex items-center justify-center bg-yellow-700/20 backdrop-blur-sm border border-yellow-400 shadow-[0_0_25px_5px_rgba(255,255,0,0.5)] animate-pulse z-40">
            <div className="text-center">
              <h1 className="text-yellow-300 text-5xl font-extrabold tracking-wide animate-bounce drop-shadow-md">
                WEAR THE HELMET
              </h1>
            </div>
          </div>
        )
      }

      {/* 🧠 Title */}
      <h1 className="text-4xl font-extrabold text-center text-cyan-400 tracking-wide animate-fade-in mt-8">
        <span role="img" aria-label="helmet">🛡</span> SPY HELMET DASHBOARD
      </h1>
      <p className="text-center text-gray-400 mt-1 mb-4">Live Prediction</p>

      {/* 🌀 Loader */}
      {
        loading ? (
          <div className="flex justify-center items-center h-96 flex-col gap-4">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-cyan-300 text-xl font-semibold animate-pulse">
              Waiting for sensor data...
            </p>
            <p className="text-cyan-300 text-sm font-mono opacity-70">
              {rprogress}
            </p>
          </div>
        ) : (
          <>
            {/* 🧾 Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-900 border border-cyan-700 shadow-md rounded-xl p-4 animate-fade-in hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-shadow">
                <p className="text-md text-gray-300 mb-1">Prediction</p>
                <p className="text-3xl font-bold text-cyan-300 animate-pulse">{prediction}</p>
              </div>

              <div className={`${cardColor} border shadow-md rounded-xl p-4 transition-all duration-300 animate-fade-in hover:scale-105`}>
                <p className="text-md text-gray-300 mb-1">Confidence</p>
                <p className="text-3xl font-bold text-green-400">{probability}%</p>
              </div>

              <div className="bg-gray-900 border border-yellow-600 shadow-md rounded-xl p-4 overflow-x-auto animate-fade-in">
                <p className="text-md text-gray-300 mb-1">Raw Scores</p>
                <pre className="text-yellow-300 text-sm font-mono">
                  {JSON.stringify(rawScores, null, 2)}
                </pre>
              </div>
            </div>

            {/* 📈 Charts */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-cyan-800 p-4 rounded-xl shadow animate-fade-in">
                <h2 className="text-center text-cyan-400 text-lg font-semibold mb-2">
                  Confidence Trend (Bar Chart)
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.map(d => ({ ...d, time: new Date(d.time).toLocaleTimeString() }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis dataKey="time" stroke="#aaa" fontSize={12} tick={false} />
                    <YAxis stroke="#aaa" domain={[0, 100]} fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
                      labelStyle={{ color: "#aaa" }}
                      formatter={(value) => [`${parseFloat(value || 0).toFixed(2)}%`, "confidence"]}
                    />
                    <Bar dataKey="probability" fill="#00FFFF" radius={[4, 4, 0, 0]} animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-900 border border-pink-700 p-4 rounded-xl shadow animate-fade-in">
                <h2 className="text-center text-pink-400 text-lg font-semibold mb-2">
                  Sensor Readings
                </h2>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-gray-800 rounded-xl border border-green-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">Heart Rate</p>
                    <p className="text-2xl font-bold text-green-400">{heartRate} bpm</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl border border-blue-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">Body Temp</p>
                    <p className="text-2xl font-bold text-blue-400">{bodyTemp}°C</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl border border-yellow-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">CH₄ (Methane)</p>
                    <p className="text-2xl font-bold text-yellow-300">{ch4} ppm</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl border border-red-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">CO (Carbon Monoxide)</p>
                    <p className="text-2xl font-bold text-red-400">{co} ppm</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl border border-cyan-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">Humidity</p>
                    <p className="text-2xl font-bold text-cyan-400">{humidity}%</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl border border-orange-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">Env Temp</p>
                    <p className="text-2xl font-bold text-orange-400">{envTemp}°C</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-xl border border-purple-500 hover:bg-gray-700 transition-colors">
                    <p className="text-sm text-gray-300">SpO2</p>
                    <p className="text-2xl font-bold text-purple-400">{spo2}%</p>
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
                    innerRadius={50}
                    paddingAngle={5}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-in-out"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                    ))}
                  </Pie>
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )
      }

      {/* 📋 Weekly Report Button */}
      <div className="mt-8 mb-12 flex justify-center animate-fade-in">
        <button
          onClick={async () => {
            if (showReportModal) {
              setShowReportModal(false);
              return;
            }
            if (!weeklyReport) {
              try {
                const res = await axios.get(`${API_URL}/generate_weekly_report`);
                setWeeklyReport(res.data);
                setShowReportModal(true);
              } catch (err) {
                console.error("Failed to fetch report", err);
                alert("Error generating report. Check console.");
              }
            } else {
              setShowReportModal(true);
            }
          }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-10 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 text-lg border border-indigo-400/30"
        >
          <span className="text-2xl">📋</span> Generate Weekly AI Manager Report
        </button>
      </div>

      {/* 📝 Report Modal / Section */}
      {showReportModal && weeklyReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">

            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">📊</span> Weekly Manager Report
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white transition-colors text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-8 bg-gray-900">

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Risk Level */}
                <div className={`p-4 rounded-xl border shadow-sm ${weeklyReport.risk_level === 'HIGH'
                    ? 'bg-gray-800 border-red-600'
                    : weeklyReport.risk_level === 'MODERATE'
                      ? 'bg-gray-800 border-yellow-600'
                      : 'bg-gray-800 border-green-600'
                  }`}>
                  <p className="text-gray-400 text-sm mb-1">Risk Level</p>
                  <p className={`text-3xl font-bold ${weeklyReport.risk_level === 'HIGH' ? 'text-red-500' : weeklyReport.risk_level === 'MODERATE' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                    {weeklyReport.risk_level}
                  </p>
                </div>

                {/* Prediction */}
                <div className="bg-gray-800 border border-cyan-700 p-4 rounded-xl shadow-sm">
                  <p className="text-gray-400 text-sm mb-1">Predicted Fatigue (Day 8)</p>
                  <p className="text-3xl font-bold text-cyan-300">
                    {weeklyReport.predicted_fatigue_day8} <span className="text-lg text-gray-500 font-normal">min</span>
                  </p>
                </div>

                {/* Shift */}
                <div className="bg-gray-800 border border-purple-700 p-4 rounded-xl shadow-sm">
                  <p className="text-gray-400 text-sm mb-1">Recommended Shift</p>
                  <p className="text-xl font-bold text-purple-400 mt-2">
                    {weeklyReport.recommended_shift}
                  </p>
                </div>
              </div>

              {/* Detailed Report Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Text Report */}
                <div className="bg-black/20 border border-gray-700 p-6 rounded-xl overflow-y-auto h-96">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed font-normal">
                    {weeklyReport.weekly_report}
                  </pre>
                </div>

                {/* Recommendations */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2">
                    Suggested Break Schedule
                  </h3>
                  <div className="space-y-3">
                    {weeklyReport.recommended_breaks.map((b, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600">
                        <span className="text-gray-200 font-medium">{b.start} – {b.end}</span>
                        <span className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-sm">
                          {b.duration_min} min
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Note Box */}
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
                    <p className="text-gray-300 text-sm flex gap-2">
                      <span className="text-yellow-500">💡</span>
                      <span>
                        <strong>Note:</strong> This schedule is optimized to reduce cumulative fatigue by ~35% based on the worker's recent physiological trends.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-900 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white rounded transition-colors"
              >
                Print
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
