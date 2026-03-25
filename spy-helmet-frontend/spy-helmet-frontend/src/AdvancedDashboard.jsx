import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, ScatterChart, Scatter,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ReferenceLine, RadialBarChart, RadialBar
} from "recharts";

export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");

  // Core Data State
  const [prediction, setPrediction] = useState("--");
  const [probability, setProbability] = useState("0.00");
  const [rawScores, setRawScores] = useState([0, 0, 0]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Vitals State
  const [heartRate, setHeartRate] = useState(0);
  const [bodyTemp, setBodyTemp] = useState(0);
  const [spo2, setSpO2] = useState(0);
  const [ch4, setCH4] = useState(0);
  const [co, setCO] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [envTemp, setEnvTemp] = useState(0);

  // Derived / Analytics State
  const [safetyScore, setSafetyScore] = useState(100);
  const [packetNo, setPacketNo] = useState("--");
  const [helmetId, setHelmetId] = useState("AWAITING...");
  const [isDataStale, setIsDataStale] = useState(false);
  const [lastPacketTime, setLastPacketTime] = useState(Date.now());
  const [alertLog, setAlertLog] = useState([]);
  const [shiftStart] = useState(Date.now());
  const [shiftDuration, setShiftDuration] = useState("00:00:00");
  const [fatigueAlert, setFatigueAlert] = useState(false);
  const [sensorAlert, setSensorAlert] = useState(false);

  // Database Tab State
  const [dbData, setDbData] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(false);

  // Reports Tab State
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // Telemetry Micro-features State
  const [latency, setLatency] = useState(0);
  const [blink, setBlink] = useState(false);
  const [rprogress, setrprogress] = useState("");

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  // Tab Definitions
  const TABS = ["Overview", "Physiology", "Environment", "Analytics", "Alerts", "Database", "Reports"];

  // Helper: Format Time
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    // Shift Timer Update
    const timerInterval = setInterval(() => {
      setShiftDuration(formatTime(Date.now() - shiftStart));
    }, 1000);

    const dataInterval = setInterval(async () => {
      const start = Date.now();
      try {
        const res = await axios.get(`${API_URL}/live_predict`);
        const lat = Date.now() - start;
        setLatency(lat);
        const data = res.data;

        if (data.status === "collecting") {
          setLoading(true);
          setrprogress(data.reading_progress || "");
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
        const spo2Val = data.spo2 ?? 0;
        const coVal = data.co_ppm ?? 0;
        const ch4Val = data.ch4_ppm ?? 0;

        const newPacketNo = data.packet_no || "--";

        if (newPacketNo !== packetNo) {
          setLastPacketTime(Date.now());
          setIsDataStale(false);
          setBlink(true);
          setTimeout(() => setBlink(false), 200);
          if (data.helmet_id) setHelmetId(data.helmet_id);
        } else if (now - lastPacketTime > 10000 && packetNo !== "--") {
          setIsDataStale(true);
          addAlert('system', 'Sensor Data Stale / Disconnected', 'high');
        }

        // Compute Heat Stress Index (HSI) for this specific tick
        const validSpo2 = (spo2Val > 50) ? spo2Val : 98;
        const spo2Risk = Math.max(0, (97 - validSpo2) * 12);
        const bodyTempRisk = Math.max(0, ((data.body_temp ?? 0) - 36.5) * 10);
        const envTempRisk = Math.max(0, ((data.env_temp ?? 0) - 25) * 1.5);
        const humidityRisk = Math.max(0, (data.humidity ?? 0) * 0.1);
        const computedHSI = Math.min(100, Math.max(0, spo2Risk + bodyTempRisk + envTempRisk + humidityRisk));

        // Calculate Worker Safety Score (0-100) based on AI + HSI + Gases
        let score = 100;

        // 1. AI Assessment Penalty (Up to -30 points)
        if (data.prediction === "Fatigue") score -= (prob / 100) * 30;
        if (data.prediction === "Stressed") score -= (prob / 100) * 10;

        // 2. Heat Stress / Physiological Penalty (Up to -50 points based on our advanced formula)
        if (computedHSI > 10) score -= (computedHSI * 0.5);

        // 3. Heart Rate Outlier Penalty (Fallback if HSI ignores high plain HR)
        if (hr > 110) score -= (hr - 110) * 0.5;

        // 4. Toxic Gas Exceedance Penalties
        if (coVal > 25) score -= (coVal - 25) * 0.6; // Approaching MSHA 50ppm
        if (ch4Val > 1000) score -= (ch4Val - 1000) * 0.003; // Approaching LEL

        score = Math.max(0, Math.round(score));

        // State Updates
        setPrediction(data.prediction);
        setPacketNo(newPacketNo);
        setRawScores(raw);
        setProbability(prob.toFixed(2));
        setHeartRate(hr);
        setBodyTemp(data.body_temp ?? 0);
        setCH4(ch4Val);
        setCO(coVal);
        setHumidity(data.humidity ?? 0);
        setEnvTemp(data.env_temp ?? 0);
        setSpO2(spo2Val);
        setSafetyScore(score);
        setLoading(false);

        // Alerts Logic
        const isFatigued = data.prediction === "Fatigue" && prob >= 80;
        if (isFatigued && !fatigueAlert) addAlert('fatigue', 'Critical Fatigue Detected', 'critical');
        setFatigueAlert(isFatigued);

        const isSensorOff = hr === 0 && !loading;
        if (isSensorOff && !sensorAlert) addAlert('system', 'Helmet Removed (HR=0)', 'high');
        setSensorAlert(isSensorOff);

        if (spo2Val < 92 && spo2Val > 0) addAlert('health', `Hypoxia Warning: SpO2 ${spo2Val}%`, 'critical');
        if (coVal > 50) addAlert('gas', `CO Danger Level: ${coVal}ppm`, 'critical');
        if (ch4Val > 10000) addAlert('gas', `CH4 Explosive Risk: ${ch4Val}ppm`, 'critical');

        // Chart Data Update (Keep last 5 mins = ~150 points if 2 sec intervals)
        setChartData((prev) => {
          const newData = [...prev, {
            time: now,
            timeStr: new Date(now).toLocaleTimeString(),
            probability: prob,
            normal: raw[0] * 100,
            stressed: raw[1] * 100,
            fatigue: raw[2] * 100,
            hr: hr,
            spo2: spo2Val,
            co: coVal,
            ch4: ch4Val,
            bodyTemp: data.body_temp ?? 0,
            envTemp: data.env_temp ?? 0,
            humidity: data.humidity ?? 0,
            stateLabel: data.prediction,
            stateScore: data.prediction === "Normal" ? 1 : data.prediction === "Stressed" ? 2 : 3, // 1=Safe, 2=Warn, 3=Danger
            safetyScore: score
          }];
          return newData.slice(-150);
        });

      } catch (err) {
        console.error("Live predict error:", err);
      }
    }, 2000); // Polling every 2s

    return () => {
      clearInterval(timerInterval);
      clearInterval(dataInterval);
    };
  }, [packetNo, fatigueAlert, sensorAlert, lastPacketTime]);

  // Alert Helper
  const addAlert = (type, message, severity) => {
    setAlertLog(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      type, message, severity
    }, ...prev].slice(0, 50));
  };

  // Fetch AI Weekly Report Data
  const fetchWeeklyReport = () => {
    setIsReportLoading(true);
    axios.get(`${API_URL}/generate_weekly_report`)
      .then(res => {
        setReportData(res.data);
        addAlert("info", "New AI Weekly Report Generated", "low");
      })
      .catch(err => {
        console.error("Report fetch failed:", err);
        addAlert("system", "Failed to generate report", "medium");
      })
      .finally(() => setIsReportLoading(false));
  };

  useEffect(() => {
    if (activeTab === "Reports" && !reportData) {
      fetchWeeklyReport();
    }
  }, [activeTab]);

  // Fetch Historical DB Data
  useEffect(() => {
    if (activeTab === "Database" && dbData.length === 0) {
      setIsDbLoading(true);
      axios.get(`${API_URL}/historical/all_sessions`)
        .then(res => {
          if (res.data) setDbData(res.data);
        })
        .catch((err) => {
          console.error("DB failed to load real historical sessions.", err);
        })
        .finally(() => setIsDbLoading(false));
    }
  }, [activeTab]);


  // Custom Tooltips / Color functions
  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-500";
  };

  const getDangerRingColor = (score) => {
    if (score >= 80) return "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
    if (score >= 50) return "border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
    return "border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse";
  };

  const getSpO2Color = (val) => val >= 95 ? "#10b981" : val >= 92 ? "#eab308" : "#ef4444";
  const getCOColor = (val) => val < 25 ? "#10b981" : val <= 50 ? "#eab308" : "#ef4444";
  const getCH4Color = (val) => val < 1000 ? "#10b981" : val <= 10000 ? "#eab308" : "#ef4444";

  // Compute overall state distribution from recent history
  const stateCounts = { Normal: 0, Stressed: 0, Fatigue: 0 };
  chartData.forEach(d => {
    if (d.stateLabel === "Normal") stateCounts.Normal++;
    else if (d.stateLabel === "Stressed") stateCounts.Stressed++;
    else if (d.stateLabel === "Fatigue") stateCounts.Fatigue++;
  });
  const totalStates = Math.max(1, chartData.length);

  // Radial Chart Data
  const scoreRadialData = [{ name: 'Safety', value: safetyScore, fill: safetyScore >= 80 ? '#10b981' : safetyScore >= 50 ? '#eab308' : '#ef4444' }];
  const coRadialData = [{ name: 'CO', value: Math.min(60, co), fill: getCOColor(co) }]; // cap at 60 for visual scale
  const ch4RadialData = [{ name: 'CH4', value: Math.min(12000, ch4), fill: getCH4Color(ch4) }];
  // Calculate Heat Stress Index (Max Weight: SpO2 > Body > Env > Humidity)
  const validSpo2 = (spo2 > 50) ? spo2 : 98; // Ignore 0 readings when disconnected
  const spo2Risk = Math.max(0, (97 - validSpo2) * 12);       // MAX WEIGHT: 12 pts per 1% SpO2 drop below 97
  const bodyTempRisk = Math.max(0, (bodyTemp - 36.5) * 10);  // HIGH WEIGHT: 10 pts per 1°C core temp rise
  const envTempRisk = Math.max(0, (envTemp - 25) * 1.5);     // MED WEIGHT: 1.5 pts per 1°C ambient heat
  const humidityRisk = Math.max(0, humidity * 0.1);          // LOWEST WEIGHT: 100% = 10 risk points

  const heatStressIndex = Math.min(100, Math.max(0, spo2Risk + bodyTempRisk + envTempRisk + humidityRisk));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1128] text-white flex flex-col items-center justify-center font-sans font-semibold">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl tracking-widest text-cyan-400 animate-pulse mb-6 uppercase">SPY System is waking up...</h2>
        {rprogress && (
          <div className="w-64">
            <div className="flex justify-between text-xs text-cyan-500 mb-1 font-bold">
              <span>BUFFERING</span>
              <span>{rprogress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${rprogress}%` }}></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1128] text-slate-300 font-sans p-4 md:p-6 overflow-x-hidden">

      {/* 🔴 OVERLAYS for Critical Events */}
      {fatigueAlert && (
        <div className="fixed inset-0 bg-red-900/90 z-50 flex items-center justify-center animate-pulse backdrop-blur-md transition-all duration-500 ease-in-out pointer-events-none">
          <div className="text-center">
            <h1 className="text-white text-5xl md:text-7xl font-extrabold animate-bounce drop-shadow-[0_0_20px_rgba(255,0,0,0.8)] font-sans hover:font-bold tracking-widest border-b-4 border-red-500 pb-4">
              ⚠️ FATIGUE CRITICAL
            </h1>
            <p className="mt-6 text-red-200 font-sans font-semibold text-xl tracking-widest">IMMEDIATE WITHDRAWAL REQUIRED</p>
          </div>
        </div>
      )}
      {sensorAlert && (
        <div className="fixed inset-0 flex items-center justify-center bg-yellow-700/80 backdrop-blur-sm shadow-[0_0_25px_5px_rgba(255,255,0,0.5)] animate-pulse z-40 pointer-events-none">
          <div className="text-center bg-black/60 p-12 rounded-3xl border border-yellow-500/50 flex flex-col items-center">
            <h1 className="text-yellow-400 text-6xl font-extrabold tracking-wide drop-shadow-md font-sans hover:font-bold uppercase">
              Helmet Removed
            </h1>
            <p className="mt-4 text-yellow-200 font-sans font-semibold text-lg tracking-widest">SENSOR CONTACT LOST (HR=0)</p>
          </div>
        </div>
      )}
      {isDataStale && (
        <div className="fixed top-0 left-0 w-full bg-yellow-600 text-black font-bold text-center py-2 z-50 shadow-[0_0_10px_rgba(202,138,4,1)]">
          WARNING: TELEMETRY DISCONNECTED. STALE DATA.
        </div>
      )}

      {/* 🎯 HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-[#0d1633]/80 p-6 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-md">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-white tracking-widest font-sans hover:font-bold">
            SPY HELMET <span className="text-cyan-500">SYSTEM</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <p className="text-sm font-sans font-semibold text-slate-500 uppercase flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isDataStale || packetNo === "--" ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span className={isDataStale || packetNo === "--" ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{isDataStale || packetNo === "--" ? 'SYSTEM OFFLINE' : 'SYSTEM ONLINE'}</span>
              <span className="hidden md:inline">|</span>
              <span>SHIFT: <span className="text-white">ALPHA P/S</span></span>
              <span className="hidden md:inline">|</span>
              <span>NODE: <span className="text-white bg-slate-800 px-2 py-1 rounded border border-slate-700">{helmetId}</span></span>
            </p>
            <div className="h-4 w-px bg-slate-700 hidden lg:block"></div>
            <p className="text-sm font-bold font-sans font-semibold tracking-wider hidden lg:flex items-center gap-2">
              <span className="text-slate-500">Global Status: </span>
              <span className={`px-2 py-1 rounded text-xs ${safetyScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : safetyScore >= 50 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {safetyScore >= 80 ? 'OPTIMAL' : safetyScore >= 50 ? 'WARNING' : 'CRITICAL'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-8 mt-5 md:mt-0 items-center justify-end w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
          {/* Micro Telemetry Widget */}
          <div className="flex flex-col items-end pt-1">
            <div className="flex gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
              <span>LATENCY: {latency}ms</span>
              <span className={`transition-colors duration-200 ${blink ? 'text-white scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : ''}`}>
                PKT: #{packetNo}
              </span>
            </div>
            {/* Micro-sparkline or simple visual */}
            <div className="h-[2px] w-24 bg-slate-800 rounded overflow-hidden">
              <div className={`h-full bg-cyan-400 ${blink ? 'w-full transition-all duration-100' : 'w-0 transition-none'}`}></div>
            </div>
          </div>

          <div className="flex flex-col items-end pl-8 border-l border-slate-700/50">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Shift Timer</span>
            <span className="text-2xl font-black font-sans font-semibold text-cyan-400 tracking-wider drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{shiftDuration}</span>
          </div>
        </div>
      </header>

      {/* 📑 TABS */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-t-lg font-bold text-sm tracking-wider uppercase transition-all ${activeTab === tab
                ? "bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 🟢 TAB 1: OVERVIEW */}
      {activeTab === "Overview" && (
        <div className="flex flex-col gap-6 animate-fade-in">

          {/* Top Row: AI & Safety Index */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left/Center 1: Worker Safety Index (MASSIVE) */}
            <div className={`p-8 rounded-2xl border bg-slate-900/80 backdrop-blur-md flex flex-col justify-between items-center text-center ${getDangerRingColor(safetyScore)} transition-all duration-500 relative overflow-hidden`}>
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-0 opacity-50"></div>

              <h2 className="relative z-10 text-sm font-bold text-slate-400 uppercase tracking-widest">Worker Safety Index</h2>

              <div className="relative z-10 flex items-center justify-center w-48 h-48 my-4">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-lg">
                  {/* Background Track */}
                  <circle cx="96" cy="96" r="76" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800/80" />
                  {/* Progress Ring */}
                  <circle
                    cx="96" cy="96" r="76"
                    stroke={safetyScore >= 80 ? '#10b981' : safetyScore >= 50 ? '#eab308' : '#ef4444'}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 76}
                    strokeDashoffset={(2 * Math.PI * 76) * (1 - safetyScore / 100)}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center mt-2">
                  <span className={`text-7xl font-black font-sans hover:font-bold ${getScoreColor(safetyScore)} leading-none`}>
                    {safetyScore}
                  </span>
                </div>
              </div>

              <p className="relative z-10 text-xs text-slate-500 font-sans font-semibold uppercase tracking-widest mt-2">Base: 100 | AI Deductions Applied</p>
            </div>

            {/* Right/Center 2: AI Assessment */}
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md flex flex-col justify-center items-center text-center">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Neural Net Assessment</h2>
              <div className={`text-4xl lg:text-5xl font-black font-sans hover:font-bold uppercase tracking-widest mb-2 ${prediction === "Normal" ? "text-emerald-400" :
                  prediction === "Stressed" ? "text-yellow-400" : "text-red-500 animate-pulse"
                }`}>
                {prediction}
              </div>
              <p className="text-slate-400 font-sans font-semibold">Confidence: <span className="text-white font-bold">{probability}%</span></p>

              {/* Sensor Status Sub-details */}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-800/80 rounded border border-slate-700 text-slate-400">
                  <span className={heartRate > 0 ? "text-emerald-500" : "text-red-500"}>●</span> BIOMETRICS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-800/80 rounded border border-slate-700 text-slate-400">
                  <span className={co >= 0 ? "text-emerald-500" : "text-red-500"}>●</span> MQ-GAS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-800/80 rounded border border-slate-700 text-slate-400">
                  <span className={bodyTemp > 0 ? "text-emerald-500" : "text-red-500"}>●</span> THERMAL
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-800/80 rounded border border-slate-700 text-slate-400">
                  <span className={!isDataStale ? "text-emerald-500 animate-pulse" : "text-red-500"}>●</span> TELEMETRY
                </span>
              </div>
            </div>

          </div>

          {/* Middle Row: ALL Sensors (8 Cards including HSI) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Heart Rate</span>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-3xl font-bold font-sans font-semibold ${heartRate > 100 || heartRate < 50 ? 'text-red-400' : 'text-emerald-400'}`}>{heartRate}</span>
                <span className="text-xs text-slate-500 mb-1">BPM</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">NORMAL: 60-100</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Blood Oxygen</span>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-3xl font-bold font-sans font-semibold`} style={{ color: getSpO2Color(spo2) }}>{spo2}</span>
                <span className="text-xs text-slate-500 mb-1">%</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">SAFE: 95-100%</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Carbon Monoxide</span>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-3xl font-bold font-sans font-semibold`} style={{ color: getCOColor(co) }}>{co.toFixed(1)}</span>
                <span className="text-xs text-slate-500 mb-1">PPM</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">MSHA LIMIT: &lt;50 PPM</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Methane (CH4)</span>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-3xl font-bold font-sans font-semibold`} style={{ color: getCH4Color(ch4) }}>{ch4.toFixed(1)}</span>
                <span className="text-xs text-slate-500 mb-1">PPM</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">LEL LIMIT: &lt;1000 PPM</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Body Temp</span>
              <div className="flex items-end gap-2 mt-2">
                <span className={`text-3xl font-bold font-sans font-semibold ${bodyTemp > 37.5 ? 'text-red-400' : 'text-blue-400'}`}>{bodyTemp.toFixed(1)}</span>
                <span className="text-xs text-slate-500 mb-1">°C</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">NORMAL: ~37.0°C</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Env Temp</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-bold font-sans font-semibold text-orange-400">{envTemp.toFixed(1)}</span>
                <span className="text-xs text-slate-500 mb-1">°C</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">AMBIENT HEAT</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Humidity</span>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-bold font-sans font-semibold text-cyan-400">{humidity.toFixed(1)}</span>
                <span className="text-xs text-slate-500 mb-1">%</span>
              </div>
              <span className="text-[10px] text-slate-600 mt-2">AIR MOISTURE</span>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Heat Stress Index</span>
              <span className={`text-4xl font-black font-sans font-semibold ${heatStressIndex >= 80 ? 'text-red-500' : heatStressIndex >= 50 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                {Math.round(heatStressIndex)}
              </span>
              <span className="text-[10px] text-slate-600 mt-2 text-center">COMPOSITE RISK</span>
            </div>

          </div>

          {/* Bottom Row: Timeline */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-80">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Safety Score Timeline</h3>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timeStr" stroke="#475569" fontSize={10} tick={{ fill: '#475569' }} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tick={{ fill: '#475569' }} />
                <Tooltip formatter={(value) => [Math.round(value) + ' / 100', 'Safety Index']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="safetyScore" stroke="#2dd4bf" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" name="Safety Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 🔴 TAB 2: PHYSIOLOGY */}
      {activeTab === "Physiology" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-80 relative overflow-hidden shadow-lg group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none group-hover:bg-purple-500/10 transition-colors duration-500"></div>

            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Blood Oxygen (SpO2) Trend</h3>
              <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20 shadow-inner font-bold tracking-wider">&lt;92% Critical</span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timeStr" stroke="#475569" fontSize={10} minTickGap={30} tickMargin={10} />
                <YAxis domain={[80, 100]} stroke="#475569" fontSize={10} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} />
                <ReferenceLine y={95} stroke="#eab308" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'Warning Zone', fill: '#eab308', fontSize: 10, opacity: 0.8 }} />
                <ReferenceLine y={92} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideBottomLeft', value: 'Critical Zone', fill: '#ef4444', fontSize: 10, opacity: 0.8 }} />
                <Area type="monotone" dataKey="spo2" stroke="#a855f7" fill="url(#spo2Grad)" strokeWidth={3} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-80 relative overflow-hidden shadow-lg group">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>

            <div className="flex justify-between items-center mb-4 relative z-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Heart Rate Analysis</h3>
              <span className="text-xs bg-emerald-900/40 text-emerald-500 px-3 py-1 rounded-full border border-emerald-800/50 font-bold tracking-wider drop-shadow-md cursor-default">60-100 Normal</span>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="hrGradRobust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timeStr" stroke="#475569" fontSize={10} minTickGap={30} tickMargin={10} />
                <YAxis domain={[40, 180]} stroke="#475569" fontSize={10} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} />
                <ReferenceLine y={110} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'top', value: 'TACHYCARDIA WARNING', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="hr" stroke="#10b981" fill="url(#hrGradRobust)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-1 lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-around">
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Heat Stress Index</h3>
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={15} data={[{ name: 'HSI', value: heatStressIndex, fill: heatStressIndex > 80 ? '#ef4444' : heatStressIndex > 50 ? '#eab308' : '#3b82f6' }]} startAngle={180} endAngle={0}>
                    <RadialBar background clockWise dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="-mt-14 flex items-baseline justify-center gap-1 w-full">
                <span className="text-3xl font-black font-sans hover:font-bold text-white">{Math.round(heatStressIndex)}</span>
                <span className="text-sm font-bold text-slate-500">/ 100</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-8 md:mt-0">
              <div className="flex justify-between w-64 border-b border-slate-800 pb-2">
                <span className="text-slate-400">Core Body Temp</span>
                <span className="font-sans font-semibold text-white">{bodyTemp.toFixed(1)} °C</span>
              </div>
              <div className="flex justify-between w-64 border-b border-slate-800 pb-2">
                <span className="text-slate-400">Ambient Temp</span>
                <span className="font-sans font-semibold text-white">{envTemp.toFixed(1)} °C</span>
              </div>
              <div className="flex justify-between w-64">
                <span className="text-slate-400">Humidity</span>
                <span className="font-sans font-semibold text-white">{humidity.toFixed(1)} %</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟡 TAB 3: ENVIRONMENT */}
      {activeTab === "Environment" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 w-full text-left">CO (Carbon Monoxide)</h3>
            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} data={coRadialData} startAngle={225} endAngle={-45}>
                  <RadialBar background={{ fill: '#1e293b' }} clockWise dataKey="value" />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="-mt-32 text-center pb-12">
              <div className="text-4xl font-black font-sans font-semibold text-white">{co.toFixed(1)}</div>
              <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">PPM</div>
              <div className="text-xs text-slate-400 mt-2">MSHA Limit: 50 PPM</div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 w-full text-left">CH4 (Methane)</h3>
            <div className="w-64 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} data={ch4RadialData} startAngle={225} endAngle={-45}>
                  <RadialBar background={{ fill: '#1e293b' }} clockWise dataKey="value" />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="-mt-32 text-center pb-12">
              <div className="text-4xl font-black font-sans font-semibold text-white">{ch4.toFixed(1)}</div>
              <div className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">PPM</div>
              <div className="text-xs text-slate-400 mt-2">Explosive Limit: 10000 PPM</div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2 bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-96">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Combined Gas Trend</h3>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeStr" stroke="#475569" fontSize={10} />
                <YAxis yAxisId="left" stroke="#eab308" orientation="left" domain={[0, 100]} />
                <YAxis yAxisId="right" stroke="#f97316" orientation="right" domain={[0, 15000]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                <Legend />
                <ReferenceLine yAxisId="left" y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'CO Danger', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={10000} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'CH4 Danger', fill: '#ef4444', fontSize: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="co" name="CO (PPM)" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="ch4" name="CH4 (PPM)" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 🟣 TAB 4: ANALYTICS */}
      {activeTab === "Analytics" && (
        <div className="grid grid-cols-1 gap-6 animate-fade-in">

          {/* Shift Progress / Load Bar */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Cumulative State Distribution</h3>
            <div className="w-full h-8 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${(stateCounts.Normal / totalStates) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-1000"></div>
              <div style={{ width: `${(stateCounts.Stressed / totalStates) * 100}%` }} className="h-full bg-yellow-500 transition-all duration-1000"></div>
              <div style={{ width: `${(stateCounts.Fatigue / totalStates) * 100}%` }} className="h-full bg-red-500 transition-all duration-1000"></div>
            </div>
            <div className="flex justify-between mt-3 text-xs font-bold uppercase tracking-widest">
              <span className="text-emerald-400">Normal: {((stateCounts.Normal / totalStates) * 100).toFixed(1)}%</span>
              <span className="text-yellow-400">Stressed: {((stateCounts.Stressed / totalStates) * 100).toFixed(1)}%</span>
              <span className="text-red-400">Fatigue: {((stateCounts.Fatigue / totalStates) * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Scatter Chart */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-96">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">SpO2 vs Body Temperature (Heat Stress Correlation)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" dataKey="bodyTemp" name="Body Temp" unit="°C" stroke="#475569" domain={[35, 40]} />
                <YAxis type="number" dataKey="spo2" name="SpO2" unit="%" stroke="#475569" domain={[85, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }} />
                <Scatter data={chartData} fill="#38bdf8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Fatigue Timeline (Simulated with BarChart because true timeline charts are complex in basic Recharts) */}
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-80">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Fatigue State Timeline</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData}>
                <XAxis dataKey="timeStr" stroke="#475569" fontSize={10} tick={false} />
                <YAxis domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={(val) => val === 1 ? 'NORM' : val === 2 ? 'STR' : 'FAT'} stroke="#475569" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} formatter={(val, name, props) => [props.payload.stateLabel, 'State']} />
                <Bar dataKey="stateScore" isAnimationActive={false}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.stateScore === 1 ? '#10b981' : entry.stateScore === 2 ? '#eab308' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* 🟠 TAB 5: ALERTS */}
      {activeTab === "Alerts" && (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl animate-fade-in min-h-[500px]">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Historical Alert Log</h3>

          {alertLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="font-sans font-semibold tracking-widest">NO ALERTS LOGGED IN CURRENT SHIFT</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertLog.map((alert) => (
                <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                    alert.severity === 'high' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-blue-500/10 border-blue-500/30'
                  }`}>
                  <div className="text-sm font-sans font-semibold text-slate-400 pt-1 shrink-0 w-24">{alert.time}</div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">{alert.type}</span>
                    <span className={`text-sm font-medium ${alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'high' ? 'text-yellow-400' : 'text-blue-400'
                      }`}>{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📄 TAB 7: REPORTS */}
      {activeTab === "Reports" && (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl animate-fade-in min-h-[500px] shadow-xl relative overflow-hidden">
          {/* Subtle Background Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800 pb-6">
            <div className="flex gap-4 items-center">
              <div className="p-3 bg-cyan-900/30 rounded-lg text-cyan-400 border border-cyan-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-100 uppercase tracking-widest font-sans hover:font-bold drop-shadow-md">AI Predictive Weekly Report</h3>
                <p className="text-xs text-slate-500 font-sans font-semibold mt-1 tracking-wider uppercase">Generated by deep learning pipeline analyzing daily KPIs.</p>
              </div>
            </div>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <button onClick={fetchWeeklyReport} disabled={isReportLoading} className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold uppercase tracking-wider text-xs hover:bg-slate-700 transition-colors flex items-center gap-2">
                {isReportLoading ? (
                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                )}
                Generate Latest
              </button>
              <button className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded font-bold uppercase tracking-wider text-xs hover:bg-cyan-600/40 transition-colors shadow-lg shadow-cyan-900/20">
                Export PDF
              </button>
            </div>
          </div>

          {isReportLoading ? (
            <div className="flex flex-col justify-center items-center h-80">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-cyan-500 font-sans font-semibold text-sm tracking-widest animate-pulse">Running Neural Inference Pipeline...</p>
            </div>
          ) : reportData ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

              {/* Quick Stats Column */}
              <div className="col-span-1 lg:col-span-1 space-y-4">
                <div className="bg-slate-800/40 p-5 border border-slate-700/50 rounded-xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-2">Target Worker ID</span>
                  <span className="text-2xl font-bold font-sans font-semibold text-slate-200">{reportData.worker_id}</span>
                </div>

                <div className="bg-slate-800/40 p-5 border border-slate-700/50 rounded-xl relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
                  <div className={`absolute top-0 left-0 w-1 h-full ${reportData.risk_level === 'LOW' ? 'bg-emerald-500' : reportData.risk_level === 'HIGH' ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Risk Level Assessment</span>
                  <span className={`text-4xl font-black font-sans hover:font-bold tracking-widest drop-shadow-md mt-1 block ${reportData.risk_level === 'LOW' ? 'text-emerald-400' : reportData.risk_level === 'HIGH' ? 'text-red-500' : 'text-yellow-400'}`}>
                    {reportData.risk_level}
                  </span>
                </div>

                <div className="bg-slate-800/40 p-5 border border-orange-500/20 rounded-xl relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                  <div className="absolute -right-4 -bottom-4 opacity-10 blur-sm pointer-events-none text-9xl">🔥</div>
                  <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest block mb-2">Predicted Shift Fatigue</span>
                  <span className="text-4xl font-black font-sans font-semibold text-orange-400 drop-shadow-md">{reportData.predicted_fatigue_day8} <span className="text-sm text-slate-500 font-sans tracking-normal">mins</span></span>
                </div>

                <div className="bg-cyan-900/20 p-5 border border-cyan-800/50 rounded-xl">
                  <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest block mb-3">AI Recommendation</span>
                  <span className="text-sm font-black text-cyan-300 uppercase tracking-widest border-b border-cyan-800 pb-1">{reportData.recommended_shift}</span>
                </div>
              </div>

              {/* Raw Report Full Text */}
              <div className="col-span-1 lg:col-span-3 bg-[#0d1633] p-8 rounded-xl border border-slate-800 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[600px] custom-scrollbar relative">
                <div className="absolute top-0 right-8 px-4 py-1 bg-slate-800 rounded-b-lg border-x border-b border-slate-700">
                  <span className="text-[10px] text-cyan-400 font-sans font-semibold uppercase tracking-widest font-bold">Secure Text Display</span>
                </div>

                <pre className="font-sans font-semibold text-sm text-slate-300 whitespace-pre-wrap leading-loose tracking-wide mt-2">
                  {reportData.weekly_report.split('\n').map((line, index) => {
                    if (line.includes('---') || line.includes('===')) {
                      return <span key={index} className="text-slate-600 block">{line}</span>
                    } else if (/^[0-9]\./.test(line)) {
                      return <span key={index} className="text-cyan-400 font-bold block mt-4">{line}</span>
                    } else if (line.includes(': ')) {
                      const [key, ...val] = line.split(': ');
                      return (
                        <span key={index} className="block">
                          <span className="text-indigo-300">{key}</span>: <span className="text-slate-200">{val.join(': ')}</span>
                        </span>
                      )
                    }
                    return <span key={index} className="block">{line}</span>
                  })}
                </pre>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 mb-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <p className="font-sans font-semibold text-slate-500 tracking-widest text-sm">NOT GENERATED OR UNAVAIABLE</p>
              <button onClick={fetchWeeklyReport} className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded font-bold uppercase tracking-wider text-xs transition-colors shadow-lg">Run Analysis Generator</button>
            </div>
          )}
        </div>
      )}

      {/* 🗄️ TAB 6: DATABASE */}
      {activeTab === "Database" && (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl animate-fade-in min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">PostgreSQL Data Archive</h3>
            <span className="text-xs px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans font-semibold rounded-full flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> DB CONNECTED
            </span>
          </div>

          {isDbLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700 shadow-inner custom-scrollbar">
              <table className="w-full text-left font-sans font-semibold text-sm whitespace-nowrap">
                <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Session ID</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Node / Helmet</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Avg HR</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Peak Temp</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">Alerts</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {dbData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 text-cyan-400">{row.id}</td>
                      <td className="px-6 py-4 text-slate-300">{row.helmet_id}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs">{row.start_time}</td>
                      <td className="px-6 py-4 text-slate-300">{row.duration}</td>
                      <td className="px-6 py-4 text-emerald-400">{row.avg_hr} bpm</td>
                      <td className="px-6 py-4 text-orange-400">{row.peak_temp} °C</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${row.events > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-500'}`}>
                          {row.events}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs uppercase tracking-wider font-bold rounded border ${row.status === 'Normal' ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-500'
                          }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
