import React, { useState } from 'react'
import Step from '../steps/Step'
import { stepsData } from '../steps/data'
import { motion, AnimatePresence } from 'framer-motion'
import ProgressBar from '../ui/ProgressBar'
import { useNavigate } from 'react-router-dom'
import ProfileCompilation from "./ProfileCompilation"

export default function StepWrapper() {
  const [index, setIndex] = useState(0)
  const [form, setForm] = useState({})
  
  const navigate = useNavigate()

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function next() {
    if (index < stepsData.length - 1) {
      setIndex(i => i + 1)
    } else {
      navigate('/profile-compilation', { state: { form } })
    }
  }

  function prev() {
    if (index > 0) setIndex(i => i - 1)
  }

  const total = stepsData.length
  const percent = Math.round((index / total) * 100)

  return (
    <div className="min-h-screen flex items-center justify-center p-6 animated-bg">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Edu Reco — Onboarding</h2>
          <div className="text-sm opacity-80">
            Step {index + 1} of {total}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <ProgressBar value={percent} />

          <div className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45 }}
              >
                <Step
                  data={stepsData[index]}
                  value={form[stepsData[index].name] || ''}
                  onChange={update}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={prev}
              className="px-4 py-2 rounded-lg border border-white/10"
            >
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setIndex(stepsData.length - 1)}
                className="px-4 py-2 rounded-lg border border-white/10"
              >
                Skip
              </button>
              <button
                onClick={next}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 shadow-md"
              >
                {index === stepsData.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
