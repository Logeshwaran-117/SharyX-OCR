/**
 * PlansBillingChatbot.jsx  — fixed version
 *
 * Changes from original:
 *  1. API call goes to /api/chat/plans (your Express backend) — not Anthropic directly.
 *     This fixes the CORS block and avoids exposing the API key in the browser.
 *  2. Added banking-statement Q&A suggestions for both contexts.
 *  3. Shows a small "Banking features" badge on Pro / Enterprise contexts.
 *
 * Drop into:  src/components/PlansBillingChatbot.jsx
 *
 * Usage (unchanged):
 *   <PlansBillingChatbot context="plans"   currentPlan={currentPlan} />
 *   <PlansBillingChatbot context="billing" billingInfo={billing} />
 */

import { useState, useRef, useEffect } from "react";
import api from "../api";

// ── Suggested questions per context ──────────────────────────────────────────
const SUGGESTIONS = {
  plans: [
    "What's included in the Pro plan?",
    "How does yearly billing save me money?",
    "Can I upgrade from Free to Enterprise directly?",
    "What happens to my history if I downgrade?",
    "Which plan is best for a small team?",
    "Do you offer a student discount?",
    "What file types are supported on each plan?",
    "How does the daily limit reset work?",
    // Banking-specific
    "Does the free plan support bank statement analysis?",
    "What banking features does Pro unlock?",
    "Can I extract transactions from PDF bank statements?",
    "Does Enterprise support bulk bank statement processing?",
    "Which plans support UPI / credit card statement parsing?",
    "Can I get a summary of monthly spending from my statement?",
  ],
  billing: [
    "How do I get a copy of my latest invoice?",
    "When does my subscription renew?",
    "How do I cancel my subscription?",
    "Can I switch from monthly to yearly billing?",
    "What payment methods are accepted?",
    "Is there GST on the invoices?",
    "How do I get a refund?",
    "Why was my card charged a different amount?",
    // Banking-specific
    "Does my plan include bank statement analysis?",
    "Can I process multiple bank statements in one go?",
    "Is my banking data stored after processing?",
    "How many bank statements can I upload per day?",
  ],
};

// ── System prompt built on the server; this is the *context string* we send ──
// The Express route (/api/chat/plans) holds the actual system prompt + API key.
// We only send the context identifier + optional billing info as part of the user message.
function buildContextPayload(context, extra) {
  return {
    context, // "plans" | "billing"
    billingInfo: extra || null,
  };
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ role, text }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 mr-2">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm"
        }`}
      >
        {text}
      </div>
    </div>
  );
}



// ── Main component ────────────────────────────────────────────────────────────
export default function PlansBillingChatbot({ context = "plans", currentPlan, billingInfo }) {
  const [open, setOpen]                       = useState(false);
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  const suggestions      = SUGGESTIONS[context] || SUGGESTIONS.plans;
  const visibleSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 5);

  const isPlanContext = context === "plans";
  const label         = isPlanContext ? "Ask about Plans" : "Ask about Billing";
  const icon          = isPlanContext ? "💳" : "🧾";



  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  // Auto-focus
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  async function sendMessage(text) {
    const q = (text || input).trim();
    if (!q || loading) return;

    setInput("");
    const userMsg     = { role: "user", text: q };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      // ── POST to Express backend at /api/chat/plans ────────────────────────
      // The backend holds the Anthropic API key — never call Anthropic directly
      // from the browser (CORS will block it).
      const { data } = await api.post("/api/chat/plans", {
        question: q,
        history: nextHistory.slice(0, -1).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        })),
        ...buildContextPayload(
          context,
          billingInfo || (currentPlan ? { plan: currentPlan } : null)
        ),
      });

      const reply = data?.reply || "Sorry, I couldn't get a response. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      console.error("Chatbot error:", err);
      const serverMsg = err?.response?.data?.message;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: serverMsg || "Something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-base shadow-sm">
            {icon}
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 dark:text-white text-sm">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ask me anything about{" "}
              {isPlanContext ? "plans, pricing, banking features & more" : "your subscription, invoices & billing"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {messages.filter((m) => m.role === "user").length}
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500 text-lg">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="bg-white dark:bg-gray-900 flex flex-col">
          {/* Messages */}
          <div className="min-h-[220px] max-h-[420px] overflow-y-auto p-5 space-y-4">
            {!hasMessages && !loading && (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
                  🤖
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">
                  Hi! I'm your {isPlanContext ? "Plans" : "Billing"} assistant.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Tap a suggestion below or type your own question — including about banking features.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    AI
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested questions — empty state */}
          {!hasMessages && (
            <div className="px-5 pb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                Suggested questions
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleSuggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition font-medium disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
                {suggestions.length > 5 && (
                  <button
                    onClick={() => setShowAllSuggestions((v) => !v)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
                  >
                    {showAllSuggestions ? "Show less" : `+${suggestions.length - 5} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick suggestions while chatting */}
          {hasMessages && !loading && (
            <div className="px-5 pt-1 pb-2 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 3).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-50 truncate max-w-[220px]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-end gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Ask about ${isPlanContext ? "plans, banking features & pricing" : "billing, invoices & banking limits"}…`}
              rows={1}
              disabled={loading}
              className="flex-1 resize-none border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Send (Enter)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
              {hasMessages && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l12 12M4 16L16 4" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}