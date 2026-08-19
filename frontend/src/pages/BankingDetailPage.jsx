import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";
import BankingReport from "./BankingReport";

export default function BankingDetailPage({ docId, onBack }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { load(); }, [docId]);

  async function load() {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await api.get(`/api/banking/history/${docId}`);
      setDoc(res.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Document not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1 mb-5">It may have been deleted.</p>
        <button onClick={onBack} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">← Back to History</button>
      </div>
    );
  }

  if (!doc) return null;

  // Map the DB schema to the same shape BankingReport expects from the analyse endpoint
  const result = {
    ...doc,
    _id: doc._id,
    filename: doc.filename,
    documentType: doc.documentType,
    accountName: doc.accountName,
    bankName: doc.bankName,
    currency: doc.currency || "USD",
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    summary: doc.summary,
    transactions: doc.transactions || [],
    analytics: doc.analytics,
    chatHistory: doc.chatHistory || [],
  };

  return <BankingReport result={result} onBack={onBack} />;
}
