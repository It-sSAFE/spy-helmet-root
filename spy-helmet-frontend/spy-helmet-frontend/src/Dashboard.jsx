import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";

export default function Dashboard() {
  const [prediction, setPrediction] = useState("--");
  const [probability, setProbability] = useState("N/A");
  const [chartData, setChartData] = useState([]);

  // Sensors
  const [heartRate, setHeartRate] = useState("--");
  const [bodyTemp, setBodyTemp] = useState("--");
  const [ch4, setCH4] = useState("--");
  const [co, setCO] = useState("--");
  const [humidity, setHumidity] = useState("--");
  const [envTemp, setEnvTemp] = useState("--");
  const [spo2, setSpO2] = useState("--");

  // System
  const [packetNo, setPacketNo] = useState("--");
  const [lastFetchStatus, setLastFetchStatus] = useState("init");
  const [latency, setLatency] = useState(0);

  // Report Vars
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Constants
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
          setPacketNo(data.packet_no || "--");
          return;
        }

        // Parse Data
        const raw = data.raw_scores || [0, 0, 0];
        const prob = Math.max(...raw) * 100;

        setPrediction(data.prediction);
        setPacketNo(data.packet_no || "--");
        setProbability(prob.toFixed(1));

        // Sensor format
        setHeartRate(data.heart_rate ? data.heart_rate.toFixed(0) : "--");
        setBodyTemp(data.body_temp?.toFixed(1) || "--");
        setCH4(data.ch4_ppm?.toFixed(2) || "--");
        setCO(data.co_ppm?.toFixed(2) || "--");
        setHumidity(data.humidity?.toFixed(0) || "--");
        setEnvTemp(data.env_temp?.toFixed(1) || "--");
        setSpO2(data.spo2 || "--");

        // Chart Update
        setChartData((prev) => {
          const newItem = {
            time: Date.now(),
            value: prob,
            hr: data.heart_rate || 0
          };
          const newArr = [...prev, newItem];
          return newArr.length > 50 ? newArr.slice(newArr.length - 50) : newArr;
        });

      } catch (err) {
        console.error(err);
        setLastFetchStatus("error");
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);


  const fetchReport = async () => {
    if (!weeklyReport) {
      try {
        const res = await axios.get(`${API_URL}/generate_weekly_report`);
        setWeeklyReport(res.data);
      } catch (e) { console.error(e); }
    }
    setShowReportModal(true);
  }

  // Helper Card Component
  const MetricCard = ({ title, value, unit, icon, color = "text-gray-900", subtext }) => (
    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-gray-50 rounded-lg text-lg text-gray-500">{icon}</span>
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${color}`}>
          {value} <span className="text-sm text-gray-400 font-medium ml-1">{unit}</span>
        </div>
        {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-gray-900 font-sans selection:bg-blue-100">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-8 py-4 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-xl">🛡</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">SPY Helmet</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wide">Manager Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold uppercase flex items-center gap-1.5 ${lastFetchStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              <span className={`w-2 h-2 rounded-full ${lastFetchStatus === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              {lastFetchStatus === 'success' ? 'Live Connected' : 'Offline'}
            </span>
            <span className="text-[10px] text-gray-400 font-mono mt-0.5">Latency: {latency}ms</span>
          </div>
          <button
            onClick={fetchReport}
            className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-gray-200/50 flex items-center gap-2"
          >
            <span>Generate Report</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-8 space-y-8">

        {/* SECTION 1: MAIN BIOMETRICS PREDICTION */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Main Status Block */}
          <div className="col-span-12 md:col-span-6 bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
            </div>

            <div className="relative z-10">
              <h2 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Real-Time Analysis</h2>
              <div className="flex items-baseline gap-4">
                <h1 className={`text-6xl font-extrabold tracking-tighter ${prediction === 'Fatigue' ? 'text-red-500' : prediction === 'Normal' ? 'text-gray-900' : 'text-yellow-500'}`}>
                  {prediction}
                </h1>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
                  {probability}% Conf.
                </span>
              </div>
              <p className="mt-4 text-gray-500 max-w-sm leading-relaxed">
                The AI model is analyzing physiological sensor data streams every 500ms. {prediction === 'Fatigue' ? 'Requires immediate attention.' : 'Operator status is optimal.'}
              </p>
            </div>
          </div>

          {/* Live Chart */}
          <div className="col-span-12 md:col-span-6 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-900 font-bold text-lg">Fatigue Probability Trend</h3>
            </div>
            <div className="flex-grow min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#1F2937', fontWeight: 600 }}
                    formatter={(value) => [`${parseFloat(value).toFixed(1)}%`, 'Risk']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>

        {/* SECTION 2: BIOMETRICS & ENVIRONMENT */}
        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            Sensor Telemetry <span className="text-gray-400 text-sm font-normal">Live Feed</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">

            {/* Heart Rate (Double Width) */}
            <div className="col-span-2 md:col-span-2">
              <MetricCard
                title="Heart Rate"
                value={heartRate}
                unit="BPM"
                icon="❤️"
                color="text-pink-500"
                subtext="Resting avg: 72 bpm"
              />
            </div>

            <div className="col-span-1 md:col-span-1">
              <MetricCard title="Body Temp" value={bodyTemp} unit="°C" icon="🌡" color={parseFloat(bodyTemp) > 37.5 ? "text-red-500" : "text-orange-500"} />
            </div>

            <div className="col-span-1 md:col-span-1">
              <MetricCard title="SpO2" value={spo2} unit="%" icon="💧" color="text-cyan-500" />
            </div>

            <div className="col-span-1 md:col-span-1">
              <MetricCard title="Humidity" value={humidity} unit="%" icon="☁️" color="text-blue-500" />
            </div>

            <div className="col-span-1 md:col-span-1">
              <MetricCard title="Amb Temp" value={envTemp} unit="°C" icon="🌤" color="text-yellow-500" />
            </div>

            <div className="col-span-1 md:col-span-1">
              <div className="grid grid-rows-2 gap-4 h-full">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">CH4</span>
                  <span className="font-bold text-purple-600">{ch4}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">CO</span>
                  <span className="font-bold text-red-600">{co}</span>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* REPORT MODAL (Clean Apple Style) */}
      {showReportModal && weeklyReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Weekly Insight</h2>
                <p className="text-sm text-gray-500">AI-generated manager briefing</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto bg-[#FAFAFA]">

              {/* Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-xs uppercase font-bold text-gray-400 mb-2">Fatigue Risk</p>
                  <p className={`text-3xl font-bold ${weeklyReport.risk_level === 'HIGH' ? 'text-red-500' : 'text-green-500'}`}>{weeklyReport.risk_level}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-xs uppercase font-bold text-gray-400 mb-2">Wait Time</p>
                  <p className="text-3xl font-bold text-gray-900">{weeklyReport.predicted_fatigue_day8} <span className="text-sm font-medium text-gray-400">min</span></p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-xs uppercase font-bold text-gray-400 mb-2">Pattern</p>
                  <p className="text-xl font-bold text-blue-600">{weeklyReport.recommended_shift}</p>
                </div>
              </div>

              {/* Text Report */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Analysis</h3>
                <p className="whitespace-pre-wrap text-gray-600 leading-relaxed font-normal text-sm">
                  {weeklyReport.weekly_report}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button onClick={() => window.print()} className="px-6 py-2 border border-gray-300 text-gray-700 font-semibold rounded-full hover:bg-gray-50 transition-colors">
                Print Report
              </button>
              <button onClick={() => setShowReportModal(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg shadow-blue-200 transition-colors">
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
