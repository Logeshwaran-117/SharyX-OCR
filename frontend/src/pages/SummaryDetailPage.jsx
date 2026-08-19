import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import { useNotifications } from "../context/NotificationContext";

let DocumentChat = null;
try {
    DocumentChat = (await import("../components/DocumentChat")).default;
} catch {
    // DocumentChat component not found
}

function SummaryDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { addNotification } = useNotifications();

    useEffect(() => {
        fetchDoc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function fetchDoc() {
        setLoading(true);
        setNotFound(false);
        try {
            const res = await api.get(`/api/history/${id}`);
            setDoc(res.data);
        } catch (error) {
            if (error.response?.status === 404) {
                setNotFound(true);
            } else {
                toast.error("Failed to load summary");
                navigate("/history");
            }
        } finally {
            setLoading(false);
        }
    }

    async function copySummary() {
        try {
            await navigator.clipboard.writeText(doc.summary);
            toast.success("Copied to clipboard!");
        } catch {
            toast.error("Failed to copy");
        }
    }

    function downloadTXT() {
        try {
            const blob = new Blob([doc.summary], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${doc.filename}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Downloaded as TXT");
        } catch {
            toast.error("Failed to download");
        }
    }

    function downloadPDF() {
        try {
            const pdf = new jsPDF();
            pdf.setFontSize(16);
            pdf.text(doc.filename, 10, 15);
            pdf.setFontSize(11);
            const lines = pdf.splitTextToSize(doc.summary, 180);
            pdf.text(lines, 10, 30);
            pdf.save(`${doc.filename}.pdf`);
            toast.success("Downloaded as PDF");
        } catch {
            toast.error("Failed to download PDF");
        }
    }



    async function handleDelete() {
        if (!window.confirm(`Delete "${doc.filename}"? This can't be undone.`)) return;
        setDeleting(true);
        try {
            await api.delete(`/api/history/${id}`);
            toast.success("Summary deleted");
            addNotification({
                title: "Summary deleted",
                message: `${doc.filename} was removed from your history.`,
                type: "info",
            });
            navigate("/history");
        } catch {
            toast.error("Failed to delete summary");
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Summary not found</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">It may have been deleted already.</p>
                <button
                    onClick={() => navigate("/history")}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                    ← Back to History
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate("/history")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-flex items-center gap-1"
            >
                ← Back to History
            </button>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 transition-colors duration-300">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-all">{doc.filename}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Uploaded {new Date(doc.uploadedAt).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition shrink-0"
                    >
                        {deleting ? "Deleting..." : "🗑️ Delete"}
                    </button>
                </div>

                {/* Stats */}
                {doc.stats && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">📝 Words</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{doc.stats.words}</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">🔤 Characters</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{doc.stats.characters}</p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">⏱ Reading Time</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{doc.stats.readingTime} min</p>
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">AI Summary</h2>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ children }) => <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-3 mt-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 mt-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-3">{children}</h3>,
                            p: ({ children }) => <p className="leading-7 mb-3 text-gray-700 dark:text-gray-300">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-6 mb-3 text-gray-700 dark:text-gray-300">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-6 mb-3 text-gray-700 dark:text-gray-300">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                            code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-red-600 dark:text-red-400">{children}</code>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">{children}</blockquote>,
                        }}
                    >
                        {doc.summary}
                    </ReactMarkdown>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={copySummary} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition font-medium">
                        📋 Copy
                    </button>
                    <button onClick={downloadTXT} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition font-medium">
                        📄 Download TXT
                    </button>
                    <button onClick={downloadPDF} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition font-medium">
                        📑 Download PDF
                    </button>
                    <button onClick={() => navigate("/history")} className="bg-gray-600 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-600 transition font-medium">
                        ← Back
                    </button>
                </div>

                {DocumentChat && (
                    <DocumentChat
                        documentId={doc._id}
                        initialChatHistory={doc.chatHistory || []}
                    />
                )}
            </div>
        </div>
    );
}

export default SummaryDetailPage;
