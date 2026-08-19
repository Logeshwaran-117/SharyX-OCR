import { useState, useEffect } from "react";

/**
 * Props:
 *  - open: boolean
 *  - onCancel: () => void
 *  - onConfirm: (fields: string[]) => void
 *  - loading: boolean
 *  - suggestedFields: string[]
 *  - loadingSuggestions: boolean
 */
function TableFieldsModal({ open, onCancel, onConfirm, loading = false, suggestedFields = [], loadingSuggestions = false }) {
  const [fields, setFields] = useState([]);
  const [input, setInput]   = useState("");
  const [error, setError]   = useState("");

  // Auto-populate with AI suggestions when they arrive
  useEffect(() => {
    if (suggestedFields.length > 0 && fields.length === 0) {
      setFields(suggestedFields);
    }
  }, [suggestedFields]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setFields([]);
      setInput("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  function addField(raw) {
    const value = raw.trim();
    if (!value) return;
    if (fields.some((f) => f.toLowerCase() === value.toLowerCase())) {
      setInput("");
      return;
    }
    setFields((prev) => [...prev, value]);
    setInput("");
    setError("");
  }

  function removeField(value) {
    setFields((prev) => prev.filter((f) => f !== value));
  }

  function toggleSuggestion(f) {
    if (fields.some((x) => x.toLowerCase() === f.toLowerCase())) {
      removeField(f);
    } else {
      addField(f);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addField(input);
    }
  }

  function handleConfirm() {
    if (fields.length === 0) {
      setError("Add at least one field for the table columns.");
      return;
    }
    onConfirm(fields);
  }

  const remainingSuggestions = suggestedFields.filter(
    (f) => !fields.some((x) => x.toLowerCase() === f.toLowerCase())
  );

  return (
    // Backdrop — blurred, dark overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      {/* Modal card — .glass for premium feel */}
      <div
        className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--primary-rgb),.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Table Columns</h2>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Choose which fields to extract from your document.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <p className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--danger)", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)" }}>
              {error}
            </p>
          )}

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                AI Suggested for this document
              </p>
              {loadingSuggestions && (
                <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                  style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
              )}
            </div>

            {loadingSuggestions ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-8 w-20 rounded-full animate-pulse"
                    style={{ background: "var(--secondary)" }} />
                ))}
              </div>
            ) : suggestedFields.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestedFields.map((f) => {
                  const selected = fields.some((x) => x.toLowerCase() === f.toLowerCase());
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleSuggestion(f)}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition font-medium"
                      style={
                        selected
                          ? { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }
                          : { borderColor: "rgba(var(--primary-rgb),.4)", color: "var(--primary)", background: "transparent" }
                      }
                    >
                      {selected ? "✓" : "+"} {f}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: "var(--muted)", opacity: 0.7 }}>
                No suggestions available — add fields manually below.
              </p>
            )}
          </div>

          {/* Selected fields */}
          {fields.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                Selected columns ({fields.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {fields.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(var(--primary-rgb),.12)",
                      color: "var(--primary)",
                      border: "1px solid rgba(var(--primary-rgb),.2)",
                    }}
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => removeField(f)}
                      className="transition hover:opacity-70"
                      style={{ color: "var(--primary)" }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--muted)" }}>
              Add a custom field
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Invoice No — press Enter"
                className="flex-1 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--secondary)",
                  color: "var(--text)",
                }}
              />
              <button
                type="button"
                onClick={() => addField(input)}
                disabled={!input.trim()}
                className="px-4 py-2 rounded-lg text-sm transition disabled:opacity-40"
                style={{ background: "var(--secondary)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            style={{ background: "var(--secondary)", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || fields.length === 0}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            {loading
              ? "⏳ Extracting..."
              : `Extract Table (${fields.length} field${fields.length !== 1 ? "s" : ""})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TableFieldsModal;