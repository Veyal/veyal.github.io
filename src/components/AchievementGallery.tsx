"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import certifications from '@/app/env/certifications.json'

export function AchievementGallery() {
    return (
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
                {/* Mask for fade effect on edges */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white/50 to-transparent z-10 dark:from-black/50 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white/50 to-transparent z-10 dark:from-black/50 pointer-events-none"></div>

                <div className="flex overflow-hidden">
                    <motion.div
                        className="flex space-x-4"
                        animate={{ x: "-50%" }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: 20,
                                ease: "linear",
                            },
                        }}
                        style={{ width: "fit-content", willChange: "transform" }}
                    >
                        {/* Duplicate items for seamless loop */}
                        {[...certifications, ...certifications].map((cert, index) => (
                            <motion.div
                                key={index}
                                className="flex-shrink-0 w-64"
                                whileHover={{ scale: 1.05, rotate: 1 }}
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
            </div>
        </motion.section>
    )
}
