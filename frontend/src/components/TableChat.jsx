import { useState, useEffect, useRef } from "react";
import api from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";

// ── Voice input hook ──────────────────────────────────────────────────────────
function useVoiceInput(onResult) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function startListening() {
    if (!supported) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "no-speech") toast.error("Mic error: " + e.error);
    };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
    };

    recognitionRef.current = rec;
    rec.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return { listening, supported, startListening, stopListening };
}

// ── Mic button ────────────────────────────────────────────────────────────────
function MicButton({ listening, supported, onStart, onStop }) {
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={listening ? onStop : onStart}
      title={listening ? "Stop recording" : "Speak your question"}
      className={`flex-shrink-0 p-2 rounded-lg transition ${
        listening
          ? "bg-red-500 text-white animate-pulse"
          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
      }`}
    >
      {listening ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 8a7 7 0 0 0 14 0h-2a5 5 0 0 1-10 0H5zm7 10v-3h-2v3H8v2h8v-2h-2z" />
        </svg>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function TableChat({ tableId, initialChatHistory = [] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialChatHistory);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef(null);

  const { listening, supported, startListening, stopListening } = useVoiceInput(
    (transcript) => setQuestion((prev) => (prev ? prev + " " + transcript : transcript))
  );

  useEffect(() => {
    setMessages(initialChatHistory);
  }, [tableId]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function loadChatHistory() {
    if (!tableId) return;
    try {
      setLoadingHistory(true);
      const res = await api.get(`/api/tables/${tableId}/chat`);
      setMessages(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && messages.length === 0) {
      loadChatHistory();
    }
  }

  async function handleAsk() {
    const q = question.trim();
    if (!q || !tableId) return;

    setMessages(prev => [...prev, { role: "user", text: q, createdAt: new Date() }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await api.post(`/api/tables/${tableId}/chat`, { question: q });
      setMessages(res.data.chatHistory || []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Failed to get an answer";
      toast.error(msg);
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "Sorry, something went wrong. Please try again.", createdAt: new Date() },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  if (!tableId) return null;

  return (
    <div className="mt-6 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <span className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          💬 Ask about this table
        </span>
        <span className="text-gray-400 dark:text-gray-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="bg-white dark:bg-gray-900 transition-colors duration-300">
          {/* Messages */}
          <div className="max-h-96 overflow-y-auto p-5 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                Ask anything about this table — e.g. "What is the total debit amount?" or "Which row has the highest balance?"
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-1">{children}</ul>,
                            li: ({ children }) => <li className="mb-0.5">{children}</li>,
                            table: ({ children }) => (
                              <table className="border-collapse text-xs mt-1 mb-1">{children}</table>
                            ),
                            th: ({ children }) => (
                              <th className="border border-gray-400 px-2 py-1 font-semibold">{children}</th>
                            ),
                            td: ({ children }) => (
                              <td className="border border-gray-400 px-2 py-1">{children}</td>
                            ),
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              ))
            )}

            {asking && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? "🎙️ Listening..." : "Ask a question about this table..."}
              rows={1}
              disabled={asking}
              className={`flex-1 resize-none border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                listening
                  ? "border-red-400 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-700"
              }`}
            />
            <MicButton
              listening={listening}
              supported={supported}
              onStart={startListening}
              onStop={stopListening}
            />
            <button
              onClick={handleAsk}
              disabled={asking || !question.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {asking ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TableChat;