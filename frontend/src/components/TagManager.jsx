// src/components/TagManager.jsx
// 3.2 — Inline tag editor used on History cards.
//
// Usage:
//   <TagManager docId={doc._id} initialTags={doc.tags || []} />

import { useState, useRef, useEffect } from "react";
import api from "../api";
import toast from "react-hot-toast";
import { Tag, X, Plus, Check, Loader2 } from "lucide-react";

export default function TagManager({ docId, initialTags = [], compact = false }) {
  const [tags, setTags]         = useState(initialTags);
  const [editing, setEditing]   = useState(false);
  const [input, setInput]       = useState("");
  const [saving, setSaving]     = useState(false);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
  }, [editing]);

  async function saveTags(newTags) {
    setSaving(true);
    try {
      const res = await api.put(`/api/history/${docId}/tags`, { tags: newTags });
      setTags(res.data.tags);
    } catch {
      toast.error("Failed to save tags");
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const trimmed = input.trim().toLowerCase().slice(0, 20);
    if (!trimmed || tags.includes(trimmed) || tags.length >= 10) return;
    const next = [...tags, trimmed];
    setTags(next);
    setInput("");
    saveTags(next);
  }

  function removeTag(tag) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    saveTags(next);
  }

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Existing tags */}
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all"
          style={{
            background: "rgba(var(--primary-rgb), 0.1)",
            color: "var(--primary)",
            border: "1px solid rgba(var(--primary-rgb), 0.2)",
          }}
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="flex items-center opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={9} />
          </button>
        </span>
      ))}

      {/* Add tag */}
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => { addTag(); setEditing(false); }}
            placeholder="tag name…"
            maxLength={20}
            className="h-5 w-24 rounded-full px-2 text-[11px] outline-none"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--primary)",
              color: "var(--text)",
            }}
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); addTag(); }}
            className="flex items-center justify-center w-5 h-5 rounded-full"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {saving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
          </button>
        </div>
      ) : (
        tags.length < 10 && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all hover:opacity-80"
            style={{
              background: "var(--secondary)",
              border: "1px dashed var(--border)",
              color: "var(--muted)",
            }}
          >
            <Plus size={9} />
            {compact ? "" : "Add tag"}
          </button>
        )
      )}
    </div>
  );
}