import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export const SplashScreen = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
      className="fixed inset-0 z-[1000] bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Decorative Circles */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] border-[1px] border-emerald-500 rounded-full"
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.05, 0.1, 0.05],
          rotate: [0, -90, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-[800px] h-[800px] border-[1px] border-emerald-600 rounded-full"
      />

      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 bg-emerald-600 rounded-3xl rotate-45 flex items-center justify-center shadow-2xl">
            <motion.div
              animate={{ rotate: -45 }}
              className="text-white"
            >
              <Sparkles className="w-12 h-12" />
            </motion.div>
          </div>
          
          {/* Pulse Rings */}
          <motion.div 
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 bg-emerald-500 rounded-3xl rotate-45 -z-10"
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-5xl font-black tracking-tighter text-stone-900 dark:text-stone-100 mb-2">
            FOREST<span className="text-emerald-600">ER</span>
          </h1>
          <p className="text-stone-500 dark:text-stone-400 font-medium tracking-[0.2em] uppercase text-xs mb-8">
            Connecting through nature
          </p>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-stone-400 dark:text-stone-500 italic text-sm max-w-xs mx-auto"
          >
            "In every walk with nature, one receives far more than he seeks."
          </motion.p>
        </motion.div>

        {/* Loading Bar */}
        <div className="mt-12 w-48 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="w-full h-full bg-emerald-600"
          />
        </div>
      </div>

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 bg-emerald-500 rounded-full"
          initial={{ 
            x: Math.random() * 100 + 'vw', 
            y: Math.random() * 100 + 'vh',
            opacity: 0
          }}
          animate={{ 
            y: [null, '-20px'],
            opacity: [0, 0.5, 0]
          }}
          transition={{ 
            duration: 2 + Math.random() * 3, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * 5
          }}
        />
      ))}
    </motion.div>
  );
};
