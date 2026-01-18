import React, { useEffect, useState } from "react";
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

export default function Dashboard() {
    const [prediction, setPrediction] = useState("--");
    const [probability, setProbability] = useState("N/A");

    // Real-time chart data arrays
    const [fatigueData, setFatigueData] = useState([]);
    const [heartRateData, setHeartRateData] = useState([]);
    const [tempData, setTempData] = useState([]);

    // Sensor States
    const [heartRate, setHeartRate] = useState("--");
    const [bodyTemp, setBodyTemp] = useState("--");
    const [ch4, setCH4] = useState("--");
    const [co, setCO] = useState("--");
    const [humidity, setHumidity] = useState("--");
    const [envTemp, setEnvTemp] = useState("--");
    const [spo2, setSpO2] = useState("--");

    // System States
    const [packetNo, setPacketNo] = useState("--");
    const [lastFetchStatus, setLastFetchStatus] = useState("init");
    const [latency, setLatency] = useState(0);

    // Report Modal
    const [weeklyReport, setWeeklyReport] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    // Data Fetching Loop
    useEffect(() => {
        const interval = setInterval(async () => {
            const start = Date.now();
            try {
                // Fetch Real-time prediction and sensor data from Backend
                // The backend uses the 'helmet.keras' model to generate these predictions
                const res = await axios.get(`${API_URL}/live_predict`);

                setLatency(Date.now() - start);
                setLastFetchStatus("success");
                const data = res.data;

                if (data.status === "collecting") {
                    setPacketNo(data.packet_no || "--");
                    return;
                }

                const now = new Date().toLocaleTimeString();
                const prob = Math.max(...(data.raw_scores || [0, 0, 0])) * 100;

                // Update Metrics
                setPrediction(data.prediction);
                setPacketNo(data.packet_no || "--");
                setProbability(prob.toFixed(1));

                setHeartRate(data.heart_rate ? data.heart_rate.toFixed(0) : "--");
                setBodyTemp(data.body_temp?.toFixed(1) || "--");
                setCH4(data.ch4_ppm?.toFixed(1) || "--");
                setCO(data.co_ppm?.toFixed(1) || "--");
                setHumidity(data.humidity?.toFixed(0) || "--");
                setEnvTemp(data.env_temp?.toFixed(1) || "--");
                setSpO2(data.spo2 || "--");

                // Update Charts (Keep last 30 points)
                const updateChart = (prev, val) => {
                    const newItem = { time: now, value: val };
                    const newArr = [...prev, newItem];
                    return newArr.length > 30 ? newArr.slice(newArr.length - 30) : newArr;
                };

                setFatigueData(prev => updateChart(prev, prob));
                setHeartRateData(prev => updateChart(prev, data.heart_rate || 0));
                setTempData(prev => updateChart(prev, data.body_temp || 0));

            } catch (err) {
                console.error("Dashboard Polling Error:", err);
                setLastFetchStatus("error");
            }
        }, 500); // 500ms update rate
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

    // Helper Components
    const StatusBadge = ({ status }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'success' ? 'bg-green-600' : 'bg-red-600'} animate-pulse`}></span>
            {status === 'success' ? 'Live' : 'Offline'}
        </span>
    );

    const ChartCard = ({ title, data, color, yDomain }) => (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col">
            <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</h4>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`grad${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={yDomain} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            itemStyle={{ color: '#374151', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#grad${color})`} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">

            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-gray-800">SpyHelmet<span className="text-gray-400 font-normal">Manager</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-[10px] text-gray-400 uppercase font-bold">Latency</div>
                        <div className="text-xs font-mono font-medium">{latency}ms</div>
                    </div>
                    <StatusBadge status={lastFetchStatus} />
                    <button onClick={fetchReport} className="bg-gray-900 hover:bg-black text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
                        Manager Reports
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Top Status Row */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Operator Status</h2>
                            <div className="flex items-center gap-4">
                                <span className={`text-5xl font-extrabold tracking-tight ${prediction === 'Fatigue' ? 'text-red-600' : 'text-gray-900'}`}>
                                    {prediction}
                                </span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                                    {probability}% Confidence
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-gray-400 text-xs uppercase font-bold">Packet</div>
                            <div className="text-2xl font-mono font-bold text-gray-800">{packetNo}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-gray-400 text-xs uppercase font-bold">Network</div>
                            <div className="text-2xl font-mono font-bold text-green-600">Good</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-gray-400 text-xs uppercase font-bold">Shift Time</div>
                            <div className="text-2xl font-mono font-bold text-gray-800">4h:12m</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-gray-400 text-xs uppercase font-bold">Battery</div>
                            <div className="text-2xl font-mono font-bold text-blue-600">88%</div>
                        </div>
                    </div>
                </section>

                {/* Charts Row */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ChartCard title="Fatigue Probability (Live)" data={fatigueData} color="#ef4444" yDomain={[0, 100]} />
                    <ChartCard title="Heart Rate (BPM)" data={heartRateData} color="#ec4899" yDomain={[60, 120]} />
                    <ChartCard title="Body Temperature (°C)" data={tempData} color="#f59e0b" yDomain={[35, 40]} />
                </section>

                {/* Sensor Data Grid */}
                <section>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Live Sensor Feed</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">

                        {/* Metric Item Helper */}
                        {([
                            { label: "Heart Rate", val: heartRate, unit: "BPM", col: "text-pink-600" },
                            { label: "Body Temp", val: bodyTemp, unit: "°C", col: parseFloat(bodyTemp) > 37.5 ? "text-red-600" : "text-orange-600" },
                            { label: "SpO2", val: spo2, unit: "%", col: "text-blue-600" },
                            { label: "Humidity", val: humidity, unit: "%", col: "text-cyan-600" },
                            { label: "Env Temp", val: envTemp, unit: "°C", col: "text-yellow-600" },
                            { label: "Methane", val: ch4, unit: "ppm", col: "text-purple-600" },
                            { label: "CO Level", val: co, unit: "ppm", col: "text-red-600" },
                        ]).map((m, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{m.label}</p>
                                <p className={`text-2xl font-bold ${m.col}`}>{m.val}<span className="text-xs text-gray-400 ml-1 font-normal">{m.unit}</span></p>
                            </div>
                        ))}

                    </div>
                </section>

            </main>

            {/* Report Modal */}
            {showReportModal && weeklyReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg">Weekly Manager Report</h3>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600 leading-relaxed">
                                {weeklyReport.weekly_report}
                            </pre>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
                            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 rounded text-sm font-medium text-white hover:bg-blue-700">Print Report</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
