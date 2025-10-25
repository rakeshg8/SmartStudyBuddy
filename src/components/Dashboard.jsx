import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FaUserCircle } from "react-icons/fa";
export default function Dashboard() {
  const { user, signOut } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
    const [hoveredCard, setHoveredCard] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

React.useEffect(() => {
  const handleScroll = () => setIsScrolled(window.scrollY > 10);
  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

return (
   <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-950 text-gray-200 p-8 fixed inset-0 overflow-auto">
     <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-gray-900 via-transparent to-transparent pointer-events-none z-0"></div>

      {/* Header */}
      <header
  className={`flex justify-between items-center mb-4 border-b border-gray-800/50 sticky top-0 z-50 px-6 py-3 rounded-b-2xl transition-all duration-300 backdrop-blur-xl ${
    isScrolled
      ? "bg-gray-950/70 shadow-lg shadow-black/30"
      : "bg-gray-950/30 shadow-sm shadow-black/10"
  }`}
>


        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Smart Study Buddy
        </h1>

        {/* Nav Links + Profile */}
        <div className="flex items-center gap-6">
          <nav className="space-x-6">
            <Link to="/" className="text-gray-400 hover:text-blue-400 transition-colors">
              Home
            </Link>
            <Link to="/workspaces" className="text-gray-400 hover:text-blue-400 transition-colors">
              My Workspaces
            </Link>
            <Link to="/stress-free" className="text-gray-400 hover:text-blue-400 transition-colors">
              Stress-Free Mode
            </Link>
          </nav>

          {/* Profile Icon */}
<div className="relative">
  <button
    onClick={() => setOpen(!open)}
    className="focus:outline-none"
  >
    <FaUserCircle className="text-3xl text-gray-300 hover:text-blue-400 transition-colors" />
  </button>

  {open && (
    <div 
      className="absolute right-0 mt-3 w-44 bg-gray-800 rounded-xl border border-gray-700 shadow-lg py-2 z-50"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
        {user?.email}
      </div>
      <button
        onClick={() => {
          setOpen(false);
          signOut();
        }}
        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )}
</div>
        </div>
      </header>

      {/* Main */}
     <main className="flex flex-col items-center text-gray-200 pt-10 pb-20 px-6">


        <h2 className="text-3xl font-bold mb-3 text-white text-center">Welcome Back 👋</h2>
<p className="text-gray-400 text-center max-w-2xl mb-8">

          Upload your study materials, manage your subjects, and get AI-powered help with understanding concepts, tracking progress, and staying motivated.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center place-items-stretch max-w-6xl mx-auto">

          {/* Quick Study */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard(0)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative h-full bg-gradient-to-br from-pink-600/90 to-rose-600/90 backdrop-blur-sm p-6 rounded-2xl border border-pink-500/30 hover:border-pink-400/50 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 flex flex-col min-h-[240px]">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span
                  className={`text-3xl transition-transform duration-300 ${hoveredCard === 0 ? "scale-125 rotate-12" : ""}`}
                >
                  ⚡
                </span>
                Quick Study
              </h3>
              <p className="text-pink-50 text-sm mb-6 leading-relaxed flex-1">
                Upload a PDF and get instant AI assistance without creating a workspace.
              </p>
              <Link
                to="/quickstudy"
                className="inline-flex items-center gap-2 text-white font-bold hover:gap-4 transition-all"
              >
                Start Now <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

          {/* Study Workspace */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative h-full bg-gradient-to-br from-blue-600/90 to-cyan-600/90 backdrop-blur-sm p-6 rounded-2xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 flex flex-col min-h-[240px]">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span
                  className={`text-3xl transition-transform duration-300 ${hoveredCard === 1 ? "scale-125 rotate-12" : ""}`}
                >
                  📚
                </span>
                Study Workspace
              </h3>
              <p className="text-blue-50 text-sm mb-6 leading-relaxed flex-1">
                Create or open subject-based workspaces for personalized assistance.
              </p>
              <Link
                to="/workspaces"
                className="inline-flex items-center gap-2 text-white font-bold hover:gap-4 transition-all"
              >
                Open Workspace <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>

       

          {/* Stress-Free Mode */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-all duration-300"></div>
            <div className="relative h-full bg-gradient-to-br from-yellow-600/90 to-orange-600/90 backdrop-blur-sm p-6 rounded-2xl border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 flex flex-col min-h-[240px]">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span
                  className={`text-3xl transition-transform duration-300 ${hoveredCard === 3 ? "scale-125 rotate-12" : ""}`}
                >
                  💬
                </span>
                Stress-Free Mode
              </h3>
              <p className="text-yellow-50 text-sm mb-6 leading-relaxed flex-1">
                Talk to AI for motivation or stress relief — stay positive while studying.
              </p>
              <Link
                to="/stress-free"
                className="inline-flex items-center gap-2 text-white font-bold hover:gap-4 transition-all"
              >
                Launch <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
        {/* Footer Section */}
<footer className="mt-32 w-full bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-400 border-t border-gray-800 py-12 px-6">
  <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-sm">
    
    {/* About Us */}
    <div>
      <h3 className="text-white font-semibold mb-3">About Us</h3>
      <p className="text-gray-400 leading-relaxed">
        <span className="text-indigo-400 font-medium">Smart Study Buddy</span> is your AI-powered learning companion — 
        designed to make studying easier, faster, and more effective with personalized tools and assistance.
      </p>
    </div>

    {/* Contact */}
    <div>
      <h3 className="text-white font-semibold mb-3">Contact</h3>
      <ul className="space-y-1">
        <li>
          <span className="text-gray-400">Email: </span>
          <a href="mailto:support@smartstudybuddy.com" className="text-indigo-400 hover:text-indigo-300 transition">
            support@smartstudybuddy.com
          </a>
        </li>
        <li>
          <span className="text-gray-400">Instagram: </span>
          <a
            href="https://www.instagram.com/abishekamgoth/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition"
          >
            @smartstudybuddy
          </a>
        </li>
      </ul>
    </div>

    {/* Disclaimer */}
    <div>
      <h3 className="text-white font-semibold mb-3">Disclaimer</h3>
      <p className="text-gray-400 leading-relaxed">
        The information provided by Smart Study Buddy is AI-generated and intended for educational purposes only. 
        Please verify any content before academic use.
      </p>
    </div>
  </div>

  {/* Divider + Quote */}
  <div className="mt-12 pt-6 border-t border-gray-800 text-center">
    <p className="text-gray-300 italic mb-3">
      “Push yourself, because no one else will do it for you. Every small step counts! 📚✨”
    </p>
    <p className="text-gray-500 text-xs">
      © {new Date().getFullYear()} Smart Study Buddy — All Rights Reserved.
    </p>
  </div>
</footer>

      </main>

    </div>
  );
}




