'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export default function Component() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-pink-200 flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full"
      >
        <h1 className="text-4xl font-bold text-pink-500 mb-6">Under Development</h1>
        
        <div className="mb-6">
          <motion.svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className="mx-auto"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              ease: "easeInOut",
              times: [0, 0.2, 0.5, 0.8, 1],
              repeat: Infinity,
              repeatDelay: 1
            }}
          >
            <circle cx="60" cy="60" r="50" fill="#FFB3BA" />
            <circle cx="45" cy="45" r="5" fill="#000" />
            <circle cx="75" cy="45" r="5" fill="#000" />
            <path d="M40 70 Q60 85 80 70" stroke="#000" strokeWidth="3" fill="none" />
          </motion.svg>
        </div>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-center mb-2">
            <AlertTriangle className="text-yellow-500 mr-2" />
            <span className="font-bold text-yellow-700">Warning</span>
          </div>
          <p className="text-yellow-700">
            Oops! This page is like Kirby after a big meal—totally gone! Just a friendly reminder: any sneaky hacking attempts might make Kirby puff up and roll over to the authorities!
          </p>
        </div>

        <p className="text-gray-600">
          We&apos;re working hard to bring you something amazing. Please check back soon!
        </p>
      </motion.div>
    </div>
  )
}