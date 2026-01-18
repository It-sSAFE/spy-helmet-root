import React, { useEffect, useState, Suspense } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
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

          {/* Left Floating Box (ECG/HR) - Hidden on mobile */}
          <div className="bg-black/20 backdrop-blur-sm border border-cyan-800/30 p-2 rounded w-48 hidden md:block opacity-50 hover:opacity-100 transition-opacity">
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

        {/* --- BOTTOM CONSOLE (PREMIUM CONTROL DECK) --- */}
        <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-auto flex flex-col justify-end pb-6 px-10">

          {/* Glass Container */}
          <div className="w-full h-full max-h-[300px] backdrop-blur-xl bg-gray-900/60 border border-cyan-500/30 rounded-t-3xl shadow-[0_-10px_80px_rgba(8,145,178,0.2)] p-4 grid grid-cols-12 gap-4 relative overflow-hidden ring-1 ring-white/10">

            {/* Decorative Top Line */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-[2px] bg-cyan-500 shadow-[0_0_10px_cyan]"></div>

            {/* --- LEFT PANEL: BIOMETRICS & WAVES --- */}
            <div className="col-span-12 md:col-span-4 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col relative group overflow-hidden">
              <div className="absolute top-2 left-3 text-[10px] text-cyan-500/70 tracking-[0.2em] font-bold">BIO_TELEMETRY</div>

              {/* Heart Rate Section */}
              <div className="mt-6 flex items-center justify-between">
                <div className="relative">
                  <span className={`text-5xl font-black tracking-tighter ${parseInt(heartRate) < 50 ? 'text-red-500' : 'text-white'}`}>{heartRate}</span>
                  <span className="text-[10px] text-gray-400 absolute -top-1 -right-8">BPM</span>
                </div>
                {/* HR Waveform Visual */}
                <div className="flex-grow ml-4 h-12 border-b border-cyan-500/20 relative overflow-hidden">
                  {/* CSS Wave Mock */}
                  <div className="w-full h-full flex items-end justify-around">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-1 bg-cyan-500 animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SpO2 & Body Temp Row */}
              <div className="mt-auto grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded border-l-2 border-green-500 flex flex-col justify-between">
                  <div className="text-[10px] text-gray-400 uppercase">O2 Saturation</div>
                  <div className="text-2xl font-bold text-green-400">{spo2}<span className="text-xs">%</span></div>
                </div>
                <div className="bg-white/5 p-3 rounded border-l-2 border-yellow-500 flex flex-col justify-between">
                  <div className="text-[10px] text-gray-400 uppercase">Core Temp</div>
                  <div className={`text-2xl font-bold ${parseFloat(bodyTemp) > 37.5 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>{bodyTemp}<span className="text-xs">°C</span></div>
                </div>
              </div>
            </div>


            {/* --- CENTER PANEL: PREDICTION ENGINE --- */}
            <div className="col-span-12 md:col-span-4 flex flex-col relative">
              {/* Main Hexagon/Circle Display Logic */}
              <div className="flex-grow bg-gradient-to-b from-cyan-900/10 to-black/60 rounded-xl border border-cyan-500/30 flex flex-col items-center justify-center relative shadow-[inset_0_0_50px_rgba(8,145,178,0.1)]">

                {/* Status Ring */}
                <div className={`w-36 h-36 rounded-full border-4 flex items-center justify-center relative ${prediction === 'Fatigue' ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]' : prediction === 'Normal' ? 'border-green-500/50 shadow-[0_0_50px_rgba(34,211,238,0.2)]' : 'border-yellow-500'} transition-all duration-1000 group`}>
                  {/* Inner Spinners */}
                  <div className="absolute inset-2 rounded-full border-t-2 border-white/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute inset-4 rounded-full border-b-2 border-white/30 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }}></div>

                  <div className="text-center z-10">
                    <div className="text-[9px] text-white/50 tracking-widest uppercase mb-1">Status</div>
                    <div className={`text-2xl font-black italic tracking-tighter ${prediction === 'Fatigue' ? 'text-red-500' : prediction === 'Normal' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {prediction.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Confidence Metric */}
                <div className="mt-4 text-center">
                  <div className="text-[9px] text-cyan-600 uppercase tracking-widest mb-1">AI_CONFIDENCE_LEVEL</div>
                  <div className="text-4xl font-bold text-white tracking-widest font-mono">{probability}%</div>
                </div>

                {/* Report Button */}
                <button
                  onClick={fetchReport}
                  className="absolute bottom-4 px-8 py-1.5 bg-cyan-900/30 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold rounded-sm transition-all uppercase tracking-[0.2em] backdrop-blur hover:shadow-[0_0_15px_cyan]"
                >
                  Open_Manager_Log
                </button>
              </div>
            </div>


            {/* --- RIGHT PANEL: ENV SENSORS & CHARTS --- */}
            <div className="col-span-12 md:col-span-4 bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col relative">
              <div className="absolute top-2 right-3 text-[10px] text-purple-400/70 tracking-[0.2em] font-bold">ENV_HAZARDS</div>

              {/* Environmental Grid */}
              <div className="grid grid-cols-3 gap-2 mt-6">
                {/* Gas 1 */}
                <div className="text-center flex flex-col items-center">
                  <Gauge value={Math.min(100, (parseFloat(ch4) / 5) * 100)} color="#a855f7" />
                  <div className="text-[9px] text-gray-500 mt-2">METHANE</div>
                  <div className="text-xs font-bold text-purple-400">{ch4}</div>
                </div>
                {/* Gas 2 */}
                <div className="text-center flex flex-col items-center">
                  <Gauge value={Math.min(100, (parseFloat(co) / 10) * 100)} color="#ef4444" />
                  <div className="text-[9px] text-gray-500 mt-2">CO LEVEL</div>
                  <div className="text-xs font-bold text-red-500">{co}</div>
                </div>
                {/* Humidity */}
                <div className="text-center flex flex-col items-center">
                  <Gauge value={parseFloat(humidity)} color="#3b82f6" />
                  <div className="text-[9px] text-gray-500 mt-2">HUMIDITY</div>
                  <div className="text-xs font-bold text-blue-400">{humidity}%</div>
                </div>
              </div>

              {/* Mini Graph at bottom */}
              <div className="mt-auto h-20 w-full opacity-60 relative">
                <div className="absolute top-0 left-0 text-[9px] text-gray-600">FATIGUE_TREND (1H)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="probability" stroke="#8884d8" fillOpacity={1} fill="url(#colorProb)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* Manager Report Modal - Simplified styling to match HUD */}
        {showReportModal && (
          <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-black/80 border border-cyan-500 p-8 max-w-4xl w-full max-h-screen overflow-auto shadow-[0_0_50px_rgba(6,182,212,0.3)] relative rounded-3xl">
              <div className="flex justify-between items-center mb-6 border-b border-cyan-900 pb-4 sticky top-0 bg-transparent z-10">
                <h2 className="text-2xl text-cyan-400 font-bold tracking-widest flex items-center gap-2">
                  <span className="text-3xl">📊</span> WEEKLY REPORT
                </h2>
                <button onClick={() => setShowReportModal(false)} className="text-red-500 border border-red-500 px-4 py-1 hover:bg-red-900/50 tracking-widest uppercase text-xs font-bold">Close Terminal</button>
              </div>
              {weeklyReport ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-cyan-800 bg-cyan-900/10 p-4 text-center rounded-xl">
                      <div className="text-gray-500 text-xs uppercase mb-2">Risk Level</div>
                      <div className={`text-4xl font-black ${weeklyReport.risk_level === 'HIGH' ? 'text-red-500' : 'text-green-500'}`}>{weeklyReport.risk_level}</div>
                    </div>
                    <div className="border border-cyan-800 bg-cyan-900/10 p-4 text-center rounded-xl">
                      <div className="text-gray-500 text-xs uppercase mb-2">Est. Fatigue</div>
                      <div className="text-3xl font-bold text-white">{weeklyReport.predicted_fatigue_day8} <span className="text-sm text-gray-400">min</span></div>
                    </div>
                    <div className="border border-cyan-800 bg-cyan-900/10 p-4 text-center rounded-xl">
                      <div className="text-gray-500 text-xs uppercase mb-2">Rec. Shift</div>
                      <div className="text-3xl font-bold text-white">{weeklyReport.recommended_shift}</div>
                    </div>
                  </div>
                  <div className="text-xs text-cyan-100 font-mono whitespace-pre-wrap leading-relaxed border border-gray-800 p-6 bg-black rounded-xl shadow-inner">
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

// ----------------------------------------------------------------------
// 🔘 CIRCULAR GAUGE COMPONENT (SVG-Based)
// ----------------------------------------------------------------------
function Gauge({ value, color = "#06b6d4" }) {
  const radius = 25;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - ((parseFloat(value) || 0) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        {/* Background Ring */}
        <circle
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress Ring */}
        <circle
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
    </div>
  );
}
