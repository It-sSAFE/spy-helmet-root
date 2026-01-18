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
import jsPDF from "jspdf";

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

    const downloadPDF = () => {
        if (!weeklyReport) return;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(22);
        doc.setTextColor(200, 150, 0); // Yellow/Orange
        doc.text("SPY HELMET", 20, 20);

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("WEEKLY SAFETY ASSESSMENT", 20, 28);

        doc.setLineWidth(0.5);
        doc.line(20, 32, 190, 32);

        // Metadata
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
        doc.text(`Worker ID: ${weeklyReport.worker_id}`, 20, 46);
        doc.text(`Risk Level: ${weeklyReport.risk_level}`, 130, 46);

        // Body Content (The generated string)
        doc.setFontSize(10);
        doc.setFont("courier", "normal"); // Monospaced for the report
        const transformText = weeklyReport.weekly_report || "";
        const splitText = doc.splitTextToSize(transformText, 170);
        doc.text(splitText, 20, 55);

        // Footer
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text("Generated by SPY Helmet AI System", 20, 280);

        doc.save(`SpyHelmet_Report_${weeklyReport.worker_id}.pdf`);
    };

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

            {/* 🚧 INDUSTRIAL SAFETY REPORT MODULE 🚧 */}
            <div className="mt-8 mb-12 flex justify-center w-full">
                <button
                    onClick={async () => {
                        if (showReportModal) {
                            setShowReportModal(false);
                            return;
                        }
                        if (!weeklyReport) {
                            try {
                                const res = await axios.get(`${API_URL}/report/generate_weekly_report`);
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
                    // DESIGN: Heavy industrial button, looks like a physical push-plate
                    className="group relative bg-yellow-500 border-4 border-black hover:bg-yellow-400 active:bg-yellow-600 active:translate-y-1 transition-all duration-75 p-0"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10"></div>
                    <div className="relative flex items-center gap-4 px-12 py-5">
                        <div className="bg-black text-yellow-500 font-bold font-mono border-2 border-black px-3 py-1 text-2xl">
                            ⚠
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-mono font-bold uppercase tracking-widest text-black/80">
                                System Control
                            </span>
                            <span className="text-xl font-black uppercase tracking-tight text-black">
                                Generate Safety Report
                            </span>
                        </div>
                    </div>
                </button>
            </div>

            {/* 🛡 MODAL: SAFETY REPORT */}
            {
                showReportModal && weeklyReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-gray-900 border-2 border-yellow-500 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-[0_0_50px_rgba(234,179,8,0.2)]">
                            {/* Header */}
                            <div className="sticky top-0 bg-yellow-500 text-black px-6 py-4 flex justify-between items-center z-10">
                                <h2 className="text-2xl font-black uppercase tracking-wider flex items-center gap-3">
                                    <span className="text-3xl">📑</span> Weekly Safety Assessment
                                </h2>
                                <div className="flex gap-4">
                                    <button
                                        onClick={downloadPDF}
                                        className="bg-black text-white hover:bg-gray-800 font-bold px-4 py-2 rounded uppercase text-sm border-2 border-black transition-colors flex items-center gap-2"
                                    >
                                        <span>⬇</span> PDF
                                    </button>
                                    <button
                                        onClick={() => setShowReportModal(false)}
                                        className="bg-red-600 text-white hover:bg-red-700 font-bold px-4 py-2 rounded uppercase text-sm border-2 border-black transition-colors"
                                    >
                                        Close Panel
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg">
                                        <p className="text-gray-400 text-xs uppercase font-bold text-center">Worker ID</p>
                                        <p className="text-2xl font-mono text-center text-white mt-1">{weeklyReport.worker_id}</p>
                                    </div>
                                    <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg">
                                        <p className="text-gray-400 text-xs uppercase font-bold text-center">Risk Assessment</p>
                                        <p className={`text-2xl font-black text-center mt-1 ${weeklyReport.risk_level === 'HIGH' ? 'text-red-500 animate-pulse' : weeklyReport.risk_level === 'MODERATE' ? 'text-yellow-400' : 'text-green-500'}`}>
                                            {weeklyReport.risk_level}
                                        </p>
                                    </div>
                                    <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg">
                                        <p className="text-gray-400 text-xs uppercase font-bold text-center">Predicted Fatigue</p>
                                        <p className="text-2xl font-mono text-center text-cyan-400 mt-1">{weeklyReport.predicted_fatigue_day8} min</p>
                                    </div>
                                    <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg">
                                        <p className="text-gray-400 text-xs uppercase font-bold text-center">Rec. Shift</p>
                                        <p className="text-lg font-bold text-center text-white mt-1 leading-tight">{weeklyReport.recommended_shift}</p>
                                    </div>
                                </div>

                                {/* Shift Schedule & Breaks */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-black/30 p-6 rounded-xl border border-gray-700">
                                        <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-sm mb-4 border-b border-gray-700 pb-2">
                                            Recommended Break Schedule
                                        </h3>
                                        <div className="space-y-3">
                                            {weeklyReport.recommended_breaks.map((b, i) => (
                                                <div key={i} className="flex justify-between items-center bg-gray-800/50 p-3 rounded border-l-4 border-cyan-500">
                                                    <span className="font-mono text-cyan-300 font-bold">{b.start} - {b.end}</span>
                                                    <span className="text-xs font-bold bg-cyan-900/50 text-cyan-200 px-2 py-1 rounded">
                                                        {b.duration_min} MIN
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Plan */}
                                    <div className="bg-black/30 p-6 rounded-xl border border-gray-700">
                                        <h3 className="text-green-500 font-bold uppercase tracking-widest text-sm mb-4 border-b border-gray-700 pb-2">
                                            Est. Impact
                                        </h3>
                                        <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
                                            <li>Fatigue duration reduction: <span className="text-green-400 font-bold">~35%</span></li>
                                            <li>Recovery efficiency improvement: <span className="text-green-400 font-bold">~40%</span></li>
                                            <li>Fatigue & gas exposure overlap reduction: <span className="text-green-400 font-bold">~50%</span></li>
                                        </ul>
                                        <div className="mt-6 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-200/80 italic">
                                            "This report is generated using AI-assisted fatigue analytics based on physiological patterns."
                                        </div>
                                    </div>
                                </div>

                                {/* Full Text Report */}
                                <div className="bg-black p-6 rounded-xl border border-gray-800 font-mono text-xs md:text-sm text-gray-400 whitespace-pre-wrap shadow-inner h-64 overflow-y-auto">
                                    {weeklyReport.weekly_report}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

