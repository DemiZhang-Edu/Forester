import React from 'react';
import { motion } from 'motion/react';

export const ForestBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1] select-none">
      {/* Sky Base */}
      <div className="absolute inset-0 bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-1000" />
      
      {/* Global Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 via-transparent to-emerald-500/10 dark:from-sky-900/20 dark:via-transparent dark:to-emerald-950/20" />

      {/* Main Light Source (Sun or Moon) */}
      <motion.div
        className="absolute -top-20 -left-20 w-[800px] h-[800px] bg-amber-200/40 dark:bg-emerald-400/10 rounded-full blur-[140px]"
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Layered Forest Elements */}
      <div className="absolute bottom-0 left-0 w-full h-full">
        {/* Distant Mountains (Large curved paths) */}
        <div className="absolute bottom-0 left-0 w-full h-[65%] opacity-20 dark:opacity-10 translate-y-10">
          <svg viewBox="0 0 1000 400" className="w-[120%] h-full fill-stone-500">
            <path d="M0 400C150 250 350 350 500 200C650 50 850 250 1000 150V400H0Z" />
          </svg>
        </div>

        {/* Rolling Hills (Mid-ground) */}
        <div className="absolute bottom-0 left-0 w-full h-[50%] flex items-end justify-around px-10 opacity-40 dark:opacity-20">
          {[...Array(6)].map((_, i) => (
            <motion.div 
              key={`hill-${i}`} 
              className="w-[30%] h-[70%] bg-emerald-900/10 rounded-t-full filter blur-3xl -mx-10"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        {/* PINE TREES (The requested distinct ones) */}
        <div className="absolute bottom-0 left-0 w-full h-[45%] flex items-end justify-around px-10 opacity-80 dark:opacity-40">
          {[...Array(9)].map((_, i) => (
            <div key={`pine-${i}`} className="flex flex-col items-center">
              {/* Branch Layers */}
              <div className="w-0 h-0 border-l-[35px] border-l-transparent border-r-[35px] border-r-transparent border-b-[90px] border-b-emerald-800/50" />
              <div className="w-0 h-0 border-l-[50px] border-l-transparent border-r-[50px] border-r-transparent border-b-[120px] border-b-emerald-800/50 -mt-16" />
              <div className="w-0 h-0 border-l-[65px] border-l-transparent border-r-[65px] border-r-transparent border-b-[150px] border-b-emerald-800/50 -mt-20" />
              {/* Trunk */}
              <div className="w-8 h-16 bg-stone-900/20 -mt-4" />
            </div>
          ))}
        </div>

        {/* Foreground Foliage (Lush bottom layer) */}
        <div className="absolute -bottom-10 left-0 w-full h-[500px] flex items-end justify-center opacity-90 dark:opacity-30">
          <svg viewBox="0 0 1000 400" className="w-[115%] h-full fill-emerald-900/10 dark:fill-emerald-100/10">
            <path d="M0 400C150 350 300 380 450 340C600 300 750 360 900 320C1000 300 1000 400 1000 400H0V400Z" />
            <path d="M1000 400C850 320 700 350 550 310C400 270 250 330 100 290C0 270 0 400 0 400H1000V400Z" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* FALLING LEAVES (Curved Paths) */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`leaf-${i}`}
          className="absolute w-5 h-5 text-emerald-800/40 dark:text-emerald-400/20"
          initial={{ 
            x: Math.random() * 100 + 'vw', 
            y: -50,
            rotate: Math.random() * 360
          }}
          animate={{ 
            y: '110vh',
            x: (Math.random() - 0.5) * 500 + 'px',
            rotate: 720
          }}
          transition={{ 
            duration: 15 + Math.random() * 10, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 20
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L9.33,13C11.5,15.5 14,15.5 16.5,13.5C21,11 22,6.5 22,6.5C18.5,8 17.5,10 16.5,12C15.5,14 14.5,14 13.5,13C12.5,12 12.5,11 13.5,10C14.5,9 16.5,8.5 17,8Z" />
          </svg>
        </motion.div>
      ))}

      {/* FIREFLIES (Only visible in night mode) */}
      <div className="hidden dark:block">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`firefly-${i}`}
            className="absolute w-2 h-2 bg-yellow-300 dark:bg-yellow-200 rounded-full blur-[1.5px]"
            initial={{ 
              x: Math.random() * 100 + 'vw', 
              y: Math.random() * 100 + 'vh',
              opacity: 0
            }}
            animate={{ 
              x: (Math.random() * 100) + 'vw',
              y: (Math.random() * 100) + 'vh',
              opacity: [0, 0.9, 0],
              scale: [0.5, 1.3, 0.5]
            }}
            transition={{ 
              duration: 7 + Math.random() * 7, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: Math.random() * 10
            }}
            style={{
              boxShadow: '0 0 15px rgba(250, 204, 21, 1)'
            }}
          />
        ))}
      </div>

      {/* Ground Mist */}
      <div className="absolute bottom-0 left-0 w-full h-56 bg-gradient-to-t from-stone-50/100 to-transparent dark:from-black/100 dark:to-transparent" />
      
    </div>
  );
};
