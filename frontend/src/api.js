import axios from "axios";
import toast from "react-hot-toast";
import { createElement as h } from "react";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    /* ── 401: redirect to login ── */
    if (status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/signup") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    /* ── 429: plan limit hit — show rich upgrade prompt ── */
    if (status === 429) {
      // Pull the human-readable reason from the server if available
      const serverMsg = error.response?.data?.message || "";
      const isDaily   = /daily|quota/i.test(serverMsg);
      const label     = isDaily ? "Daily quota reached" : "Plan limit reached";
      const detail    = serverMsg || "You've used all requests on your current plan.";

      toast(
        (t) =>
          h("div", { style: { display: "flex", flexDirection: "column", gap: 6, minWidth: 260 } },
            h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
              h("span", { style: { fontSize: 18 } }, "🔒"),
              h("strong", { style: { fontSize: 14 } }, label),
            ),
            h("p", { style: { fontSize: 12, opacity: 0.85, margin: 0 } }, detail),
            h("div", { style: { display: "flex", gap: 8, marginTop: 2 } },
              h("a", {
                href: "/pricing",
                onClick: () => toast.dismiss(t.id),
                style: {
                  flex: 1,
                  textAlign: "center",
                  padding: "6px 0",
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#4F46E5,#818cf8)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: "none",
                },
              }, "Upgrade plan →"),
              h("button", {
                onClick: () => toast.dismiss(t.id),
                style: {
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                },
              }, "Dismiss"),
            ),
          ),
        {
          duration: 8000,
          style: {
            background: "#1e1b4b",
            color: "#fff",
            padding: "14px 16px",
            borderRadius: 12,
            maxWidth: 340,
          },
        }
      );

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;