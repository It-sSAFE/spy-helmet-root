import React, { useEffect, useState, Suspense } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import Scene3D from "./Scene3D"; // Import the 3D Scene

export default function Dashboard() {
  const [prediction, setPrediction] = useState("--");
  const [probability, setProbability] = useState("N/A");
  const [rawScores, setRawScores] = useState([0, 0, 0]);
  const [chartData, setChartData] = useState([]);
  const [heartRate, setHeartRate] = useState("--");
  const [bodyTemp, setBodyTemp] = useState("--");
  const [ch4, setCH4] = useState("--");
  const [co, setCO] = useState("--");
  const [humidity, setHumidity] = useState("--");
  const [envTemp, setEnvTemp] = useState("--");
  const [spo2, setSpO2] = useState("--");
  const [packetNo, setPacketNo] = useState("--");
  const [lastFetchStatus, setLastFetchStatus] = useState("init");

  // Report Vars
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Connection Vars
  const [latency, setLatency] = useState(0);
  const [lastPacketTime, setLastPacketTime] = useState(Date.now());
  const [isDataStale, setIsDataStale] = useState(false);

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
          const newPacketNo = data.packet_no || "--";
          if (newPacketNo !== packetNo) {
            setLastPacketTime(Date.now());
            setIsDataStale(false);
            setPacketNo(newPacketNo);
          }
          return;
        }

        const raw = data.raw_scores || [0, 0, 0];
        const prob = Math.max(...raw) * 100;
        const hr = data.heart_rate ?? 0;
        const newPacketNo = data.packet_no || "--";

        if (newPacketNo !== packetNo) {
          setLastPacketTime(Date.now());
          setIsDataStale(false);
        } else if (Date.now() - lastPacketTime > 10000 && packetNo !== "--") {
          setIsDataStale(true);
        }

        setPrediction(data.prediction);
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

        // Chart Data Update
        setChartData((prevData) => {
          const newData = [
            ...prevData,
            {
              time: Date.now(),
              probability: prob,
              fatigue: raw[2] * 100,
              stress: raw[1] * 100,
              hr: hr
            }
          ];
          return newData.filter((d) => Date.now() - d.time <= 60000); // 1 min window
        });

      } catch (err) {
        console.error("Error fetching prediction:", err);
        setLastFetchStatus("error");
      }
    }, 500);

    return () => clearInterval(interval);
  }, [packetNo]);

  // Report Fetcher
  const fetchReport = async () => {
    if (!weeklyReport) {
      try {
        const res = await axios.get(`${API_URL}/generate_weekly_report`);
        setWeeklyReport(res.data);
      } catch (e) { console.error(e); }
    }
    setShowReportModal(true);
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono text-cyan-500 select-none">

      {/* 🌌 3D BACKGROUND LAYER */}
      <Suspense fallback={<div className="text-center mt-20 text-cyan-500 animate-pulse">Initializing Neural Link...</div>}>
        <Scene3D heartRate={heartRate} bodyTemp={bodyTemp} />
      </Suspense>

      {/* 🛡️ HUD OVERLAY LAYER */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">

        {/* --- TOP HUD --- */}
        <div className="flex justify-between items-start p-6 bg-gradient-to-b from-black/90 to-transparent pointer-events-auto">
          {/* Left: Branding */}
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
              SPY HELMET <span className="text-white text-sm not-italic opacity-50 px-2 border-l border-white/30">MK-III</span>
            </h1>
            <p className="text-xs text-cyan-700 tracking-[0.3em]">BIOMETRIC TELEMETRY SYSTEM</p>
          </div>

          {/* Right: Status */}
          <div className="text-right">
            <div className={`text-xl font-bold ${lastFetchStatus === 'success' ? 'text-green-500' : 'text-red-500'} animate-pulse`}>
              {lastFetchStatus === 'success' ? '● SYSTEM ONLINE' : '○ DISCONNECTED'}
            </div>
            <div className="text-xs text-gray-500 flex gap-4 justify-end mt-1">
              <span>LATENCY: {latency}ms</span>
              <span>PKT: {packetNo}</span>
            </div>
          </div>
        </div>

        {/* --- CENTER (Empty for 3D View) --- */}
        <div className="flex-grow flex items-center justify-between px-10 pointer-events-auto relative">

          {/* Left Floating Box (ECG/HR) */}
          <div className="bg-black/20 backdrop-blur-sm border border-cyan-800/30 p-2 rounded w-48 hidden md:block">
            <div className="text-xs text-cyan-700 uppercase mb-1">Heart Rhythm</div>
            <div className="h-10 border-b border-cyan-500/20 relative overflow-hidden">
              {/* Simulated ECG Line */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full animate-[ping_1s_linear_infinite]" style={{ animationDuration: `${60 / (heartRate || 60)}s` }}></div>
            </div>
          </div>

          {/* Floating Alert if Fatigue */}
          {prediction === "Fatigue" && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
              <div className="bg-red-900/60 border-2 border-red-500 text-red-100 px-10 py-6 rounded-lg backdrop-blur-md animate-bounce shadow-[0_0_50px_rgba(239,68,68,0.6)] text-center">
                <h2 className="text-4xl font-extrabold tracking-widest">⚠ FATIGUE WARNING</h2>
                <p className="text-sm uppercase tracking-wider mt-2">Operator Performance Compromised</p>
              </div>
            </div>
          )}
        </div>

        {/* --- BOTTOM CONSOLE (The Dashboard) --- */}
        <div className="bg-black/80 backdrop-blur-lg border-t-2 border-cyan-500/50 p-4 h-[35vh] grid grid-cols-12 gap-4 pointer-events-auto shadow-[0_-10px_50px_rgba(6,182,212,0.15)]">

          {/* PANEL 1: EKG / History */}
          <div className="col-span-12 md:col-span-4 bg-black/40 border border-cyan-900/50 rounded-lg p-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-cyan-900/50 text-[10px] px-2 py-0.5 text-cyan-200">HISTORICAL_LOG</div>
            <h3 className="text-xs text-cyan-600 mb-1">CONFIDENCE TREND</h3>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Area type="monotone" dataKey="probability" stroke="#22d3ee" fillOpacity={1} fill="url(#colorProb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* PANEL 2: RAW DATA & GAUGES */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-2">
            {/* Top: Main Prediction */}
            <div className="flex-grow bg-black/40 border border-cyan-900/50 rounded-lg flex items-center justify-center relative shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
              <div className="text-center">
                <p className="text-xs text-cyan-600 tracking-widest mb-2">SYSTEM ANALYSIS</p>
                <div className={`text-5xl font-black tracking-tighter ${prediction === 'Fatigue' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,1)]' : prediction === 'Normal' ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-yellow-400'}`}>
                  {prediction.toUpperCase()}
                </div>
                <p className="text-xl text-white font-bold mt-1">{probability}% <span className="text-xs text-gray-500 font-normal">CONFIDENCE</span></p>
              </div>
            </div>

            {/* Bottom: Raw Scores Bar */}
            <div className="h-16 bg-black/40 border border-cyan-900/50 rounded-lg p-2 flex items-center justify-around text-center">
              <div>
                <div className="text-[10px] text-gray-500">NORM</div>
                <div className="text-green-400 font-bold">{(rawScores[0] * 100).toFixed(0)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">STRS</div>
                <div className="text-yellow-400 font-bold">{(rawScores[1] * 100).toFixed(0)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500">FAIL</div>
                <div className="text-red-400 font-bold">{(rawScores[2] * 100).toFixed(0)}</div>
              </div>
              <div className="w-px h-full bg-gray-700"></div>
              <button
                onClick={fetchReport}
                className="bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-600/50 text-yellow-500 px-4 py-1 text-xs font-bold rounded hover:shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all uppercase tracking-wider"
              >
                Report
              </button>
            </div>
          </div>

          {/* PANEL 3: ENVIRONMENTAL SENSORS */}
          <div className="col-span-12 md:col-span-4 bg-black/40 border border-cyan-900/50 rounded-lg p-3 grid grid-cols-2 gap-2 overflow-y-auto">
            <div className="absolute top-0 right-0 bg-cyan-900/50 text-[10px] px-2 py-0.5 text-cyan-200 rounded-bl">ENV_SENSORS</div>

            <div className="col-span-2 text-xs text-cyan-700 font-bold uppercase border-b border-cyan-900/30 pb-1 mb-1">Atmospheric Data</div>

            <SensorItem label="CH4 (Methane)" value={ch4} unit="ppm" color="text-purple-400" />
            <SensorItem label="CO Level" value={co} unit="ppm" color="text-red-400" />
            <SensorItem label="Humidity" value={humidity} unit="%" color="text-blue-400" />
            <SensorItem label="Amb Temp" value={envTemp} unit="°C" color="text-orange-400" />
            <SensorItem label="SpO2" value={spo2} unit="%" color="text-green-400" />
          </div>

        </div>

        {/* Manager Report Modal - Simplified styling to match HUD */}
        {showReportModal && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-black border border-cyan-500 p-8 max-w-4xl w-full max-h-screen overflow-auto shadow-[0_0_50px_rgba(6,182,212,0.3)] relative">
              <div className="flex justify-between items-center mb-6 border-b border-cyan-900 pb-4 sticky top-0 bg-black z-10">
                <h2 className="text-2xl text-cyan-400 font-bold tracking-widest flex items-center gap-2">
                  <span className="text-3xl">📊</span> WEEKLY REPORT
                </h2>
                <button onClick={() => setShowReportModal(false)} className="text-red-500 border border-red-500 px-4 py-1 hover:bg-red-900/50 tracking-widest">CLOSE_TERMINAL</button>
              </div>
              {weeklyReport ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-cyan-800 p-4 text-center">
                      <div className="text-gray-500 text-xs uppercase">Risk</div>
                      <div className={`text-2xl font-bold ${weeklyReport.risk_level === 'HIGH' ? 'text-red-500' : 'text-green-500'}`}>{weeklyReport.risk_level}</div>
                    </div>
                    <div className="border border-cyan-800 p-4 text-center">
                      <div className="text-gray-500 text-xs uppercase">Est. Fatigue</div>
                      <div className="text-2xl font-bold text-white">{weeklyReport.predicted_fatigue_day8} min</div>
                    </div>
                    <div className="border border-cyan-800 p-4 text-center">
                      <div className="text-gray-500 text-xs uppercase">Shift</div>
                      <div className="text-2xl font-bold text-white">{weeklyReport.recommended_shift}</div>
                    </div>
                  </div>
                  <div className="text-xs text-cyan-100 font-mono whitespace-pre-wrap leading-relaxed border border-gray-800 p-4 bg-gray-900/50">
                    {weeklyReport.weekly_report}
                  </div>
                </>
              ) : <div className="text-cyan-500 animate-pulse text-center p-10">ANALYZING DATA STREAMS...</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Helper for sensors
function SensorItem({ label, value, unit, color }) {
  return (
    <div className="bg-black/20 p-2 rounded border border-white/5 flex flex-col justify-center hover:bg-white/5 transition-colors">
      <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      <span className={`text-xl font-mono font-bold ${color}`}>{value}<span className="text-xs text-gray-600 ml-1">{unit}</span></span>
    </div>
  )
}
