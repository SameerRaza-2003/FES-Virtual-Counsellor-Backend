// src/screens/ProfileCompilation.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function ProfileCompilation() {
  const stages = [
    { percent: 30, text: 'Compiling your profile…' },
    { percent: 60, text: 'Finding best-matching universities…' },
    { percent: 90, text: 'Refining recommendations…' },
    { percent: 100, text: 'Almost ready…' }
  ]

  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState(stages[0].text)
  const navigate = useNavigate()
  const location = useLocation()

  const form = location.state?.form || null
  const currentStageRef = useRef(0)

  useEffect(() => {
    if (!form) {
      navigate('/', { replace: true })
      return
    }

    currentStageRef.current = 0
    setStage(stages[0].text)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            navigate('/recommendations', { state: { form } })
          }, 800)
          return 100
        }

        const nextValue = prev + 1

        if (
          currentStageRef.current < stages.length - 1 &&
          nextValue >= stages[currentStageRef.current].percent
        ) {
          currentStageRef.current += 1
          setStage(stages[currentStageRef.current].text)
        }

        return nextValue
      })
    }, 75) // Adjust speed here for progress increment

    return () => clearInterval(interval)
  }, [form, navigate])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 text-white">
      <motion.h1
        className="text-3xl font-bold mb-6 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {stage}
      </motion.h1>

      <div className="w-full max-w-xl bg-white/10 rounded-full h-4 overflow-hidden mb-4 z-10">
        <motion.div
          className="h-4 bg-gradient-to-r from-blue-400 to-cyan-400"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      <div className="text-lg z-10">{progress}%</div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
  key={i}
  className="absolute text-3xl"
  style={{
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    zIndex: 0,
    userSelect: 'none',
  }}
  initial={{ y: 0, opacity: 0 }}
  animate={{
    y: [0, -200],
    opacity: [0, 1, 0],
  }}
  transition={{
    repeat: Infinity,
    duration: 10 + Math.random() * 6,  // slower than before
    delay: Math.random() * 3,
  }}
>
  {['🎓', '📚', '💡', '🖥️'][Math.floor(Math.random() * 4)]}
</motion.div>

        ))}
      </div>
    </div>
  )
}
