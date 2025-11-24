"use client"

import { motion } from "framer-motion"

export function HeroSection() {
    return (
        <motion.div
            className="text-center mb-8 relative"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.6 }}
        >
            {/* Background Blur/Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-pink-200/20 via-purple-200/20 to-blue-200/20 blur-3xl rounded-full -z-10"></div>

            <div className="relative inline-block group cursor-default">
                <h1 className="text-5xl sm:text-7xl font-black mb-2 relative z-10">
                    <span className="bg-gradient-to-b from-pink-400 via-pink-500 to-pink-600 bg-clip-text text-transparent drop-shadow-2xl animate-gradient-y bg-[length:200%_200%]">
                        VEYAL&apos;S
                    </span>
                </h1>
                <h2 className="text-3xl sm:text-5xl font-black relative z-10">
                    <span className="bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent drop-shadow-2xl animate-gradient-y bg-[length:200%_200%] delay-75">
                        DREAM LAND
                    </span>
                </h2>

                {/* Interactive Floating Elements */}
                <motion.div
                    className="absolute -top-8 -left-8 text-4xl cursor-pointer"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    whileHover={{ scale: 1.5, rotate: 0 }}
                >
                    ⭐
                </motion.div>
                <motion.div
                    className="absolute -top-6 -right-8 text-3xl cursor-pointer"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.5, rotate: 180 }}
                >
                    ✨
                </motion.div>
                <motion.div
                    className="absolute -bottom-4 left-0 text-2xl cursor-pointer"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.5, rotate: -45 }}
                >
                    🌟
                </motion.div>
                <motion.div
                    className="absolute -bottom-4 right-0 text-3xl cursor-pointer"
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    whileHover={{ scale: 1.5, rotate: 45 }}
                >
                    💫
                </motion.div>
            </div>
        </motion.div>
    )
}
