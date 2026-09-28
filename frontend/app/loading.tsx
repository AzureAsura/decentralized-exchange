'use client'

import React from 'react'
import { motion } from 'framer-motion'

const Loading = () => {
  return (
    <div className="relative min-h-[85vh] md:min-h-screen w-full bg-transparent text-white flex flex-col justify-center items-center px-4 pt-16 pb-6 sm:px-6 md:px-8 overflow-hidden select-none font-sans">

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [0.9, 1.15, 0.9],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-[450px] sm:h-[450px] bg-blue-500/15 rounded-full blur-[100px] pointer-events-none"
      />

      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-6 z-10">

        <div className="relative flex items-center justify-center">

          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-blue-500/40"
          />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-transparent border-t-blue-400 border-r-cyan-400"
          />

          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/20 border border-blue-400/30"
          />

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
            }}
            className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0B0E17] border border-blue-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.4)] z-10"
          >
            <motion.svg
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </motion.svg>
          </motion.div>
        </div>

      </div>
    </div>
  )
}

export default Loading
