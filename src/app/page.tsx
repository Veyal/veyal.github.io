"use client"

import {useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useAnimation } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LockIcon, KeyIcon, CodeIcon } from "lucide-react"
import tools from '@/app/env/tools.json'
import certifications from '@/app/env/certifications.json'
import React from "react"

const iconMap = {
  LockIcon,
  KeyIcon,
  CodeIcon,
}

function getIconComponent(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] || CodeIcon
}

export default function HomePage() {
  const certContainerRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()

  useEffect(() => {
    const container = certContainerRef.current
    if (!container) return

    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth
    const scrollDistance = scrollWidth - clientWidth

    const animateContainer = () => {
      container.style.transform = `translateX(-${scrollDistance}px)`
      container.style.transition = "transform 5s ease-in-out"

      setTimeout(() => {
        container.style.transform = "translateX(0)"
        container.style.transition = "transform 5s linear"
        setTimeout(animateContainer, 5000)
      }, 5000)
    }

    animateContainer()

    const handleResize = () => {
      animateContainer()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, []);

  return (
    <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 sm:py-12 relative z-10">
        
        {/* Kirby Game Title Screen Style Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.6 }}
        >
          <div className="relative inline-block">
            <h1 className="text-5xl sm:text-7xl font-black mb-2">
              <span className="bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 bg-clip-text text-transparent drop-shadow-2xl">
                VEYAL'S
              </span>
            </h1>
            <h2 className="text-3xl sm:text-5xl font-black">
              <span className="bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl">
                DREAM LAND
              </span>
            </h2>
            <div className="absolute -top-8 -left-8 text-4xl animate-spin-slow">⭐</div>
            <div className="absolute -top-6 -right-8 text-3xl animate-bounce">✨</div>
            <div className="absolute -bottom-4 left-0 text-2xl animate-pulse">🌟</div>
            <div className="absolute -bottom-4 right-0 text-3xl animate-bounce" style={{ animationDelay: '0.5s' }}>💫</div>
          </div>
        </motion.div>

        {/* Character Select Card - Centered */}
        <motion.div 
          className="max-w-4xl mx-auto mb-12"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.2 }}
        >
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 rounded-[3rem] blur-2xl opacity-30 animate-pulse"></div>
            
            {/* Main Character Card */}
            <div className="relative bg-gradient-to-br from-white/95 via-pink-50/95 to-purple-50/95 dark:from-gray-900/95 dark:via-purple-950/95 dark:to-pink-950/95 backdrop-blur-sm rounded-[3rem] p-8 border-4 border-pink-400 dark:border-pink-600">
              
              {/* Top Section - Profile */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                {/* Avatar with Game Frame */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
                  <div className="relative">
                    <Image 
                      src="/profile.png" 
                      alt="Andrew Salim" 
                      width={120} 
                      height={120} 
                      className="rounded-full border-4 border-white shadow-2xl"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      LV. 1
                    </div>
                  </div>
                </div>
                
                {/* Character Info */}
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-gray-100">Andrew Salim</h3>
                  <p className="text-lg text-pink-500 dark:text-pink-400 font-bold">@Veyal</p>
                  <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                    <Link href="https://veyal.github.io">
                      <button className="px-4 py-2 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-full text-sm font-bold hover:scale-110 transition-transform shadow-lg">
                        🏰 Portfolio
                      </button>
                    </Link>
                    <Link href="https://www.linkedin.com/in/andrew-salim/" target="_blank" rel="noopener noreferrer">
                      <button className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-full text-sm font-bold hover:scale-110 transition-transform shadow-lg">
                        💼 LinkedIn
                      </button>
                    </Link>
                  </div>
                </div>
                
                {/* Stats Panel */}
                <div className="bg-white/50 dark:bg-black/30 rounded-2xl p-4 min-w-[200px]">
                  <div className="text-center mb-2 font-bold text-pink-600 dark:text-pink-400">PLAYER STATS</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>⚔️ Attack</span>
                      <span className="font-bold">★★★★★</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛡️ Defense</span>
                      <span className="font-bold">★★★★★</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⚡ Speed</span>
                      <span className="font-bold">★★★★☆</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🧠 Intelligence</span>
                      <span className="font-bold">★★★★★</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Power-Ups / Abilities */}
              <div className="border-t-2 border-pink-200 dark:border-pink-800 pt-4">
                <h4 className="text-center font-bold text-pink-600 dark:text-pink-400 mb-3">⭐ COLLECTED ABILITIES ⭐</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-2xl p-3 border-2 border-pink-300 dark:border-pink-600 text-center hover:scale-105 transition-transform">
                    <span className="text-2xl">🔐</span>
                    <div className="text-sm font-bold mt-1">Security Rookie</div>
                    <div className="text-xs opacity-75">Learning to Hack!</div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl p-3 border-2 border-purple-300 dark:border-purple-600 text-center hover:scale-105 transition-transform">
                    <span className="text-2xl">💻</span>
                    <div className="text-sm font-bold mt-1">Code Beginner</div>
                    <div className="text-xs opacity-75">Still Googling!</div>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-2xl p-3 border-2 border-cyan-300 dark:border-cyan-600 text-center hover:scale-105 transition-transform">
                    <span className="text-2xl">🤿</span>
                    <div className="text-sm font-bold mt-1">Ocean Newbie</div>
                    <div className="text-xs opacity-75">Can Hold Breath!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stage Select / Tools Section */}
        <motion.section
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-black">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎮 SELECT STAGE 🎮
              </span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Choose your adventure!</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {tools.map((tool, index) => (
              <motion.div
                key={index}
                whileHover={tool.status === "ready" ? { scale: 1.05, rotate: 1 } : {}}
                whileTap={tool.status === "ready" ? { scale: 0.95 } : {}}
                className="relative"
              >
                {/* Stage Number */}
                <div className="absolute -top-3 -left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10">
                  {index + 1}
                </div>
                
                {tool.status === "ready" ? (
                  <Link href={tool.path}>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-400 rounded-2xl blur-md opacity-0 group-hover:opacity-50 transition-opacity"></div>
                      <div className="relative bg-gradient-to-br from-white to-pink-50 dark:from-gray-800 dark:to-purple-900 rounded-2xl p-6 border-3 border-pink-300 dark:border-pink-600 shadow-xl hover:shadow-2xl transition-all">
                        <div className="flex flex-col items-center text-center">
                          {React.createElement(getIconComponent(tool.icon), {
                            className: "w-12 h-12 mb-3 text-pink-500 dark:text-pink-400 group-hover:animate-bounce"
                          })}
                          <h3 className="font-bold text-gray-800 dark:text-gray-100">{tool.name}</h3>
                          <div className="mt-2 text-xs font-bold text-green-500 animate-pulse">► PLAY</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="relative opacity-60">
                    <div className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border-3 border-gray-400 dark:border-gray-600">
                      <div className="flex flex-col items-center text-center">
                        {React.createElement(getIconComponent(tool.icon), {
                          className: "w-12 h-12 mb-3 text-gray-400 dark:text-gray-500"
                        })}
                        <h3 className="font-bold text-gray-600 dark:text-gray-400">{tool.name}</h3>
                        <div className="mt-2 text-xs font-bold text-yellow-500">
                          {tool.status === "in-development" ? "🔨 BUILDING" : "🔒 LOCKED"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Achievement Gallery / Certifications */}
        <motion.section 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-black">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                🏆 ACHIEVEMENT GALLERY 🏆
              </span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Collected power-ups and badges!</p>
          </div>
          
          <div className="relative overflow-hidden bg-gradient-to-r from-pink-100/50 to-purple-100/50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-3xl p-6 border-3 border-pink-300 dark:border-pink-600">
            <motion.div
              ref={certContainerRef}
              className="flex space-x-4"
              animate={controls}
            >
              {certifications.map((cert, index) => (
                <motion.div
                  key={index}
                  className="flex-shrink-0 w-64 h-48"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 border-pink-300 dark:border-pink-600 shadow-lg hover:shadow-xl transition-shadow h-full">
                    <div className="flex flex-col items-center justify-between h-full">
                      <div className="relative mb-3">
                        <Image src={cert.image} alt={cert.name} width={80} height={40} className="rounded-lg" />
                        {cert.abbreviation === "AWS-CCP" && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            NEW!
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center flex-grow justify-center">
                        <h4 className="font-bold text-sm text-center text-pink-600 dark:text-pink-400">
                          {cert.abbreviation}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{cert.organization}</p>
                      </div>
                      <div className="mt-2 text-xs text-center">
                        <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                          {cert.issued}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

      </div>
    </div>
  )
}