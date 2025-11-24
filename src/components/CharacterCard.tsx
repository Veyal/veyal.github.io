"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"

export function CharacterCard() {
    return (
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
    )
}
