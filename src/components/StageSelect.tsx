"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import React from "react"
import { LockIcon, KeyIcon, CodeIcon } from "lucide-react"
import tools from '@/app/env/tools.json'

const iconMap = {
    LockIcon,
    KeyIcon,
    CodeIcon,
}

function getIconComponent(iconName: string) {
    return iconMap[iconName as keyof typeof iconMap] || CodeIcon
}

export function StageSelect() {
    return (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {tools.map((tool, index) => (
                    <motion.div
                        key={index}
                        whileHover={tool.status === "ready" ? { y: -10 } : {}}
                        className="relative group"
                    >
                        {/* Stage Badge */}
                        <div className="absolute -top-4 -left-4 z-20">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-lg font-black w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 transform -rotate-12 group-hover:rotate-0 transition-transform duration-300">
                                {index + 1}
                            </div>
                        </div>

                        {tool.status === "ready" ? (
                            <Link href={tool.path} className="block h-full">
                                <div className="relative h-full">
                                    {/* Glow Behind */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>

                                    {/* Card Content */}
                                    <div className="relative h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl p-1 border-4 border-white/50 dark:border-gray-700/50 shadow-xl overflow-hidden group-hover:border-pink-400 dark:group-hover:border-pink-500 transition-colors duration-300">
                                        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                        <div className="relative h-full bg-white/50 dark:bg-gray-800/50 rounded-[1.2rem] p-6 flex flex-col items-center text-center border border-white/20 dark:border-white/10">
                                            {/* Icon Container */}
                                            <div className="mb-4 relative">
                                                <div className="absolute inset-0 bg-pink-400/20 rounded-full blur-md animate-pulse"></div>
                                                {React.createElement(getIconComponent(tool.icon), {
                                                    className: "w-14 h-14 text-pink-500 dark:text-pink-400 relative z-10 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300"
                                                })}
                                            </div>

                                            <h3 className="font-black text-xl text-gray-800 dark:text-gray-100 mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                                                {tool.name}
                                            </h3>

                                            <div className="mt-auto pt-4">
                                                <span className="inline-block px-4 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold rounded-full shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                                                    START GAME ►
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ) : (
                            <div className="relative h-full opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                                <div className="h-full bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl p-1 border-4 border-gray-200 dark:border-gray-700 shadow-lg">
                                    <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 rounded-[1.2rem] p-6 flex flex-col items-center text-center">
                                        <div className="mb-4">
                                            {React.createElement(getIconComponent(tool.icon), {
                                                className: "w-14 h-14 text-gray-400 dark:text-gray-600"
                                            })}
                                        </div>
                                        <h3 className="font-bold text-xl text-gray-500 dark:text-gray-500 mb-2">{tool.name}</h3>
                                        <div className="mt-auto pt-4">
                                            <span className="inline-block px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-full">
                                                {tool.status === "in-development" ? "🚧 UNDER CONSTRUCTION" : "🔒 LOCKED"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.section>
    )
}
