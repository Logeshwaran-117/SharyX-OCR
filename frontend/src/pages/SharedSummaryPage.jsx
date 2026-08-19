/**
 * SharedSummaryPage.jsx
 * Public, no-auth page served at /shared/:token
 * Add to App.jsx: <Route path="/shared/:token" element={<SharedSummaryPage />} />
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, ExternalLink } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SharedSummaryPage() {
  const { token } = useParams();
  const [doc, setDoc]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Public endpoint — no auth cookie needed
        const res = await axios.get(`${API_BASE}/api/history/shared/${token}`);
        setDoc(res.data);
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 text-center">
        <p className="text-5xl mb-4">🔗</p>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Link not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
          This share link is invalid or has been revoked by the owner.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
        >
          Go to SharyX OCR
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FileText size={15} />
            <span>Shared via <span className="font-semibold text-blue-600 dark:text-blue-400">SharyX OCR</span></span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try SharyX OCR <ExternalLink size={11} />
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8">

          {/* Title + date */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-all mb-1">
            {doc.filename}
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
            Summarized on {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>

          {/* Stats */}
          {doc.stats && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "📝 Words",        value: doc.stats.words },
                { label: "🔤 Characters",   value: doc.stats.characters },
                { label: "⏱ Reading Time",  value: `${doc.stats.readingTime} min` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
            <h2 className="text-base font-semibold text-gray-600 dark:text-gray-300 mb-4 uppercase tracking-wide text-xs">
              AI Summary
            </h2>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-3 mt-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 mt-3">{children}</h2>,
                p: ({ children }) => <p className="leading-7 mb-3 text-gray-700 dark:text-gray-300">{children}</p>,
                ul: ({ children }) => <ul className="list-disc ml-6 mb-3 text-gray-700 dark:text-gray-300">{children}</ul>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
              }}
            >
              {doc.summary}
            </ReactMarkdown>
          </div>

          {/* CTA */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Want to summarize your own documents?
            </p>
            <Link
              to="/signup"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
            >
              Get started free →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          This is a read-only view. The owner can revoke access at any time.
        </p>
      </div>
    </div>
  );
}