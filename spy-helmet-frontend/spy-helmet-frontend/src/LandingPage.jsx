import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.15),transparent_60%)] animate-pulse" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-bold font-[Orbitron] text-cyan-400 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)] animate-pulse">
          SPY-HELMET SYSTEM
        </h1>
        <h2 className="text-xl md:text-2xl text-cyan-300 font-[Orbitron] tracking-widest animate-pulse">
          It sees what you can't 
        </h2>

        <p className="max-w-2xl text-gray-300 text-lg md:text-xl leading-relaxed">
          Revolutionizing safety with{" "}
          <span className="text-cyan-400 font-semibold">AI-powered fatigue monitoring</span>.  
          Track real-time mental and physical states with precision and style.
        </p>

        {/* Buttons */}
        <div className="flex space-x-6 mt-6">
          <button
            onClick={() => navigate("/login")}
            className="relative px-8 py-3 text-lg font-semibold rounded-xl overflow-hidden group"
          >
            <span className="absolute inset-0 w-full h-full transition duration-300 ease-out transform -translate-x-full bg-cyan-500 group-hover:translate-x-0"></span>
            <span className="absolute inset-0 w-full h-full border-2 border-cyan-500 rounded-xl"></span>
            <span className="relative text-white">Login</span>
          </button>
          <button
            onClick={() => navigate("/register")}
            className="relative px-8 py-3 text-lg font-semibold rounded-xl overflow-hidden group"
          >
            <span className="absolute inset-0 w-full h-full transition duration-300 ease-out transform translate-x-full bg-green-500 group-hover:translate-x-0"></span>
            <span className="absolute inset-0 w-full h-full border-2 border-green-500 rounded-xl"></span>
            <span className="relative text-white">Register</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
