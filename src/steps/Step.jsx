import React from 'react'

export default function Step({ data, value, onChange }) {
  const { title, name, placeholder, type, options } = data

  return (
    <div className="min-h-[320px] flex flex-col items-center justify-center">
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-sm text-gray-200 mb-6">
        Tell us about {title.toLowerCase()}.
      </p>

      <div className="w-full max-w-xl">
        {type === 'mcq' ? (
          <div className="flex flex-wrap gap-3 justify-center">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onChange(name, opt)}
                className={`px-6 py-3 rounded-xl border transition-all duration-200 
                  ${value === opt
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={placeholder}
            className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 
                       text-white placeholder-gray-400
                       focus:outline-none focus:border-pink-400 focus:shadow-lg focus:shadow-pink-500/30 
                       transition-all duration-300 transform focus:scale-[1.02]"
          />
        )}
      </div>
    </div>
  )
}
