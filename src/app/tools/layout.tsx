"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toolsData from "@/app/env/tools.json";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const readyTools = toolsData.filter((tool) => tool.status === "ready");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return (
    <section className="min-h-screen">
      {/* Kirby-style Navigation Header */}
      <motion.header 
        className="relative overflow-visible z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.4 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 opacity-30 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100/80 via-purple-100/80 to-blue-100/80 backdrop-blur-sm"></div>
        
        {/* Floating Decorations */}
        <div className="absolute top-2 left-10 text-2xl animate-bounce opacity-60">⭐</div>
        <div className="absolute top-4 right-20 text-xl animate-pulse opacity-50">✨</div>
        <div className="absolute bottom-2 left-1/4 text-2xl animate-bounce opacity-40" style={{ animationDelay: '1s' }}>🌟</div>
        
        <div className="relative z-10 p-4 lg:p-6">
          <div className="flex items-center gap-4">
            {/* Back Button - Kirby Style */}
            <motion.button
              onClick={() => router.push("/")}
              className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-pink-400 to-pink-500 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 text-sm lg:text-base lg:px-6 lg:py-3 flex-shrink-0"
              whileHover={{ rotate: -5 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-lg lg:text-xl group-hover:animate-bounce">🏠</span>
              <span className="hidden sm:inline">Dream Land</span>
              <span className="sm:hidden">Back</span>
              <span className="absolute -top-2 -right-2 text-sm opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
            </motion.button>

            {/* Title - On left side after back button */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse whitespace-nowrap">
                ⭐ Power-Up Station ⭐
              </h1>
            </div>

            {/* Spacer to push navigation to the right */}
            <div className="flex-grow"></div>

            {/* Tool Navigation Pills */}
            <nav className="flex gap-2 items-center">
              {/* Show first 3 tools on tablet and desktop */}
              {readyTools.slice(0, 3).map((tool, index) => (
                <Link
                  key={tool.name}
                  href={tool.path}
                  className="hidden sm:block"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1, type: "spring", bounce: 0.5 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative px-3 py-1.5 lg:px-4 lg:py-2 rounded-full font-semibold text-xs lg:text-sm whitespace-nowrap
                      transition-all duration-300 cursor-pointer
                      ${pathname === tool.path
                        ? "bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-400/50"
                        : "bg-white/80 text-pink-600 hover:bg-pink-100 border-2 border-pink-300"
                      }
                    `}
                  >
                    {pathname === tool.path && (
                      <motion.span 
                        className="absolute -top-1 -right-1 text-xs"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        ⭐
                      </motion.span>
                    )}
                    
                    <span className="flex items-center gap-1">
                      <span className="text-sm lg:text-base">
                        {tool.name.includes("Encryptor") && "🔐"}
                        {tool.name.includes("Password") && "🔑"}
                        {tool.name.includes("JSON") && "📝"}
                        {tool.name.includes("AES") && "🛡️"}
                      </span>
                      <span className="hidden lg:inline">{tool.name}</span>
                      <span className="lg:hidden">
                        {tool.name.includes("Encryptor") && "Encrypt"}
                        {tool.name.includes("Password") && "Password"}
                        {tool.name.includes("JSON") && "JSON"}
                        {tool.name.includes("AES") && "AES"}
                      </span>
                    </span>
                  </motion.div>
                </Link>
              ))}
              
              {/* Mobile: Show first 2 tools */}
              {readyTools.slice(0, 2).map((tool, index) => (
                <Link
                  key={`mobile-${tool.name}`}
                  href={tool.path}
                  className="sm:hidden"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1, type: "spring", bounce: 0.5 }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      relative p-2 rounded-full
                      transition-all duration-300 cursor-pointer
                      ${pathname === tool.path
                        ? "bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg"
                        : "bg-white/80 text-pink-600 hover:bg-pink-100 border-2 border-pink-300"
                      }
                    `}
                  >
                    <span className="text-base">
                      {tool.name.includes("Encryptor") && "🔐"}
                      {tool.name.includes("Password") && "🔑"}
                      {tool.name.includes("JSON") && "📝"}
                      {tool.name.includes("AES") && "🛡️"}
                    </span>
                    {pathname === tool.path && (
                      <motion.span 
                        className="absolute -top-1 -right-1 text-xs"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        ⭐
                      </motion.span>
                    )}
                  </motion.div>
                </Link>
              ))}
              
              {/* More button with dropdown */}
              {readyTools.length > 2 && (
                <div className="relative z-[1000]">
                  <motion.button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-white/80 border-2 border-pink-300 text-pink-600 font-semibold text-xs lg:text-sm hover:bg-pink-100 transition-all flex items-center gap-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="hidden sm:inline">+{readyTools.length - 3} more</span>
                    <span className="sm:hidden">+{readyTools.length - 2}</span>
                    <motion.span
                      animate={{ rotate: showDropdown ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-pink-500"
                    >
                      ▼
                    </motion.span>
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, type: "spring", bounce: 0.3 }}
                        className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl border-2 border-pink-300 dark:border-pink-600 shadow-2xl overflow-hidden z-[9999]"
                      >
                        <div className="p-2">
                          {/* On mobile show tools starting from index 2, on desktop from index 3 */}
                          {readyTools.slice(isMobile ? 2 : 3).map((tool, index) => (
                            <Link
                              key={tool.name}
                              href={tool.path}
                              onClick={() => setShowDropdown(false)}
                            >
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`
                                  flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm
                                  transition-all duration-200 cursor-pointer group
                                  ${pathname === tool.path
                                    ? "bg-gradient-to-br from-pink-500 to-purple-500 text-white"
                                    : "hover:bg-pink-100 dark:hover:bg-pink-900/30 text-gray-700 dark:text-gray-300"
                                  }
                                `}
                                whileHover={{ x: 5 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <span className="text-lg group-hover:animate-bounce">
                                  {tool.name.includes("Encryptor") && "🔐"}
                                  {tool.name.includes("Password") && "🔑"}
                                  {tool.name.includes("JSON") && "📝"}
                                  {tool.name.includes("AES") && "🛡️"}
                                </span>
                                <span className="flex-1">{tool.name}</span>
                                {pathname === tool.path && (
                                  <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="text-sm"
                                  >
                                    ⭐
                                  </motion.span>
                                )}
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* Bottom Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-6">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-6">
            <path 
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
              className="fill-pink-200/30 dark:fill-pink-900/30"
            ></path>
          </svg>
        </div>
      </motion.header>

      {/* Main content area with Kirby background */}
      <div className="relative">
        {/* Background effects */}
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="relative z-10 p-4 lg:p-8">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
}
