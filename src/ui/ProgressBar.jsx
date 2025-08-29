import React from 'react'
import { motion } from 'framer-motion'

export default function ProgressBar({value=0}){
  return (
    <div>
      <div className="w-full bg-white/6 h-3 rounded-full overflow-hidden">
        <motion.div
          className="h-3 rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
          initial={{width: 0}}
          animate={{width: value + '%'}}
          transition={{duration: 0.6}}
        />
      </div>
    </div>
  )
}
