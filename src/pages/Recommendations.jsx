import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function FESGuide() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! 👋 I’m your Virtual Counsellor Mentora. Ask me anything about study abroad, applications, or services."
    }
  ]);
  const [input, setInput] = useState("");
  const [activeFAQ, setActiveFAQ] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false); // 📱 for mobile toggle
  const messagesEndRef = useRef(null);

  const faqs = [
    "How do I apply to universities abroad?",
    "What are the English language requirements?",
    "How can I contact my counsellor?",
    "Scholarship opportunities?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setMessages((prev) => [...prev, { sender: "bot", text: "Thinking..." }]);

    const eventSource = new EventSource(
      `https://fes-mentoro-backend.onrender.com/stream?q=${encodeURIComponent(text)}`
    );

    let responseText = "";

    eventSource.onmessage = (e) => {
      if (e.data === "[DONE]") {
        eventSource.close();
      } else {
        if (responseText === "") {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { sender: "bot", text: e.data };
            return copy;
          });
        } else {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              sender: "bot",
              text: copy[copy.length - 1].text + e.data,
            };
            return copy;
          });
        }
        responseText += e.data;
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      eventSource.close();
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          sender: "bot",
          text: "⚠️ Something went wrong!"
        };
        return copy;
      });
    };
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#0ea5e9] text-white font-sans">
      {/* Sidebar (hidden on mobile) */}
      <div className={`fixed inset-0 z-30 bg-[#0f172a]/95 p-4 transition-transform duration-300 md:static md:w-72 md:flex-shrink-0 md:bg-white/10 ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <h1 className="text-2xl font-bold mb-6">Mentora</h1>
        <h2 className="text-sm opacity-80 mb-2">FAQs</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {faqs.map((faq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveFAQ(idx);
                sendMessage(faq);
                setShowSidebar(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/20 transition-colors ${activeFAQ === idx ? "bg-white/20" : ""}`}
            >
              {faq}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col mx-auto w-full max-w-5xl p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-4 py-2 bg-white/10 rounded-xl shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold">FES Mentora</h2>
          {/* Mobile FAQ toggle */}
          <button
            className="md:hidden px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            FAQs
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-2 sm:px-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-4 py-3 rounded-2xl break-words max-w-[85%] sm:max-w-[70%] leading-relaxed text-sm sm:text-base ${
                  msg.sender === "bot"
                    ? "bg-white/10 border border-white/20 text-blue-100 prose prose-invert max-w-none"
                    : "bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-md"
                }`}
              >
                {msg.text === "Thinking..." ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm opacity-70">Thinking</span>
                    <div className="flex space-x-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                ) : (
                  <ReactMarkdown
                    className="prose prose-invert text-sm sm:text-base leading-relaxed"
                    components={{
                      p: ({ children }) => <p className="m-0 mb-2">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc ml-5 mb-2">{children}</ul>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </motion.div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 px-2 sm:px-4 pb-3">
          <input
            className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="px-4 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 shadow-lg hover:scale-105 transition-transform text-sm sm:text-base"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
