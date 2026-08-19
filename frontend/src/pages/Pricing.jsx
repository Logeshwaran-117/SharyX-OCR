import { useState, useEffect, useCallback } from "react";
import api from "../api";
import PlansBillingChatbot from "../components/PlansBillingChatbot";

// ── Cashfree loader ───────────────────────────────────────────────────────────
function loadCashfree() {
  return new Promise((resolve) => {
    if (window.Cashfree) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Plan Meta ─────────────────────────────────────────────────────────────────
const META = {
  free:       { grad: "from-gray-600 to-gray-700",    ring: "ring-gray-500",   btn: "bg-gray-600 hover:bg-gray-500",   icon: "🆓" },
  pro:        { grad: "from-blue-600 to-blue-800",    ring: "ring-blue-500",   btn: "bg-blue-600 hover:bg-blue-500",   icon: "⭐" },
  enterprise: { grad: "from-purple-600 to-purple-900",ring: "ring-purple-500", btn: "bg-purple-600 hover:bg-purple-500",icon: "🏢" },
};

// ── Invoice Modal ─────────────────────────────────────────────────────────────
function InvoiceModal({ invoiceId, onClose }) {
  const [inv, setInv] = useState(null);

  useEffect(() => {
    api.get(`/api/billing/invoice/${invoiceId}`).then(r => setInv(r.data));
  }, [invoiceId]);

  const handlePrint = () => window.print();

  if (!inv) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-10">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:p-0"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 print:hidden">
          <h2 className="font-bold text-gray-800">Invoice {inv.invoiceNumber}</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium">
              🖨️ Print / Save PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Invoice body */}
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-gray-900">{import.meta.env.VITE_APP_NAME || "SharyX OCR"}</h1>
              <p className="text-sm text-gray-500 mt-1">Tax Invoice</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice No.</p>
              <p className="font-bold text-gray-800">{inv.invoiceNumber}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(inv.issuedAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
            </div>
          </div>

          {/* Billed to */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Billed To</p>
            <p className="font-semibold text-gray-800">{inv.issuedTo.name || "—"}</p>
            <p className="text-sm text-gray-500">{inv.issuedTo.email}</p>
          </div>

          {/* Line items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Description</th>
                <th className="text-right py-2 text-gray-500 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-gray-700">{item.description}</td>
                  <td className="py-3 text-gray-700 text-right">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{inv.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST (18%)</span>
              <span>₹{inv.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
              <span>Total (incl. GST)</span>
              <span>₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Payment info */}
          {/* Payment info */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-green-700 mb-1">✅ Payment Successful</p>
            <p className="text-green-600">Payment ID: <span className="font-mono text-xs">{inv.cashfreePaymentId}</span></p>
            <p className="text-green-600">Order ID:   <span className="font-mono text-xs">{inv.cashfreeOrderId}</span></p>
          </div>

          <p className="text-xs text-gray-400 text-center">Thank you for your subscription.</p>
        </div>
      </div>
    </div>
  );
}

// ── Payment Checkout Modal ─────────────────────────────────────────────────────
function CheckoutModal({ plan, cycle, price, onClose, onSuccess }) {
  const [step, setStep]       = useState("confirm"); // confirm → processing → done → error
  const [errMsg, setErrMsg]   = useState("");
  const [resultMsg, setResultMsg] = useState("");

  const planMeta = META[plan?.id || "pro"];

  const startPayment = async () => {
  setStep("processing");
  try {
    const loaded = await loadCashfree();
    if (!loaded) throw new Error("Cashfree SDK failed to load. Check your internet connection.");

    // Create order on backend
    const { data: order } = await api.post("/api/billing/create-order", {
      plan: plan.id,
      billingCycle: cycle,
    });

    // Initialize Cashfree drop-in checkout
    const cashfree = window.Cashfree({ mode: import.meta.env.VITE_CASHFREE_ENV || "sandbox" });

    const checkoutOptions = {
      paymentSessionId: order.paymentSessionId,
      redirectTarget:   "_modal",  // opens as popup, not redirect
    };

    const result = await cashfree.checkout(checkoutOptions);

    if (result.error) {
      // Payment dismissed or failed
      if (result.error.type === "user_dropped") {
        setStep("confirm");  // User closed the modal
      } else {
        setErrMsg(result.error.message || "Payment failed.");
        setStep("error");
      }
      return;
    }

    // result.paymentDetails contains basic info — verify on backend for security
    try {
      const { data } = await api.post("/api/billing/verify-payment", {
        orderId: order.orderId,
      });
      setResultMsg(data.message);
      setStep("done");
      onSuccess(data);
    } catch(e) {
      setErrMsg(e.response?.data?.message || "Payment verification failed.");
      setStep("error");
    }

  } catch(e) {
    setErrMsg(e.message || "Failed to start payment.");
    setStep("error");
  }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && step !== "processing" && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className={`bg-gradient-to-br ${planMeta.grad} px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{planMeta.icon}</span>
              <div>
                <p className="text-white font-bold text-lg">{plan?.name} Plan</p>
                <p className="text-white/70 text-sm capitalize">{cycle} billing</p>
              </div>
            </div>
            {step !== "processing" && (
              <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
            )}
          </div>
        </div>

        <div className="p-6">

          {/* CONFIRM step */}
          {step === "confirm" && (
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{plan?.name} ({cycle})</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">₹{price.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">GST (18%)</span>
                  <span className="text-gray-600 dark:text-gray-300">₹{Math.round(price * 0.18).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">₹{Math.round(price * 1.18).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300">You get:</p>
                {(plan?.features || []).slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-green-500">✓</span><span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                <p>💳 Secure payment via Cashfree. Supports UPI, Cards, Net Banking, Wallets.</p>
                <p className="mt-1">You can cancel anytime. Refunds as per our policy.</p>
              </div>

              <button onClick={startPayment}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-base transition ${planMeta.btn}`}>
                Pay ₹{Math.round(price * 1.18).toLocaleString("en-IN")} →
              </button>
            </div>
          )}

          {/* PROCESSING step */}
          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Opening payment window…</p>
              <p className="text-xs text-gray-400">Complete the payment in the Cashfree window</p>
            </div>
          )}

          {/* DONE step */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-3xl">✅</div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-lg">Payment Successful!</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{resultMsg}</p>
              </div>
              <button onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm">
                Start Using {plan?.name} →
              </button>
            </div>
          )}

          {/* ERROR step */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-3xl">❌</div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-lg">Payment Failed</p>
                <p className="text-red-500 text-sm mt-1">{errMsg}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("confirm")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold text-sm">Try Again</button>
                <button onClick={onClose}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2 rounded-xl font-semibold text-sm">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, current, billing, cycle, onSelect }) {
  const meta          = META[plan.id];
  const price         = plan.price[cycle];
  const isCurrentPlan = current === plan.id;
  const isFree        = plan.id === "free";
  const isDowngrade   = !isFree && ["pro","enterprise"].indexOf(current) > ["pro","enterprise"].indexOf(plan.id);

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200
      ${isCurrentPlan ? `ring-2 ${meta.ring} border-transparent scale-[1.02]` : "border-gray-700 hover:border-gray-500"}`}>

      {(plan.popular ?? plan.id === "pro") && !isCurrentPlan && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-blue-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide">POPULAR</span>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">ACTIVE</span>
        </div>
      )}

      {/* Header */}
      <div className={`bg-gradient-to-br ${meta.grad} px-6 pt-7 pb-6`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{meta.icon}</span>
          <h3 className="text-xl font-black text-white">{plan.name}</h3>
        </div>
        {isFree ? (
          <p className="text-4xl font-black text-white">Free</p>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-white/70 text-xl">₹</span>
              <span className="text-4xl font-black text-white">{price.toLocaleString("en-IN")}</span>
              <span className="text-white/60 text-sm">/{cycle === "monthly" ? "mo" : "yr"}</span>
            </div>
            {cycle === "yearly" && (
              <p className="text-xs text-green-300 mt-1 font-semibold">
                Save ₹{((plan.price.monthly * 12) - plan.price.yearly).toLocaleString("en-IN")}/year
              </p>
            )}
            {cycle === "monthly" && (
              <p className="text-xs text-white/50 mt-1">₹{(plan.price.yearly / 12).toFixed(0)}/mo billed yearly</p>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <div className="bg-gray-800 px-6 py-5 flex-1 space-y-2.5">
        {plan.features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm">
            <span className="text-green-400 shrink-0 mt-0.5 font-bold">✓</span>
            <span className="text-gray-300">{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-gray-800 px-6 pb-6">
        {isCurrentPlan ? (
          <div className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 text-sm font-semibold text-center">
            ✓ Your current plan
          </div>
        ) : isFree ? (
          <button onClick={() => onSelect(plan, cycle)}
            className="w-full py-3 rounded-xl bg-gray-600 hover:bg-gray-500 text-white text-sm font-semibold transition">
            Downgrade to Free
          </button>
        ) : (
          <button onClick={() => onSelect(plan, cycle)}
            className={`w-full py-3 rounded-xl text-white font-bold text-sm transition ${meta.btn}`}>
            {isDowngrade ? `Switch to ${plan.name}` : `Upgrade to ${plan.name}`} →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Pricing Page ──────────────────────────────────────────────────────────
export default function Pricing({ user }) {
  const [cycle, setCycle]       = useState("monthly");
  const [plans, setPlans]       = useState({});
  const [billing, setBilling]   = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [checkout, setCheckout] = useState(null);    // { plan, cycle, price }
  const [viewInvoice, setViewInvoice] = useState(null); // invoiceId
  const [activeTab, setActiveTab] = useState("plans"); // plans | invoices
  const [cancelLoading, setCancelLoading] = useState(false);

  const load = useCallback(async () => {
    const [pRes, bRes, iRes] = await Promise.allSettled([
      api.get("/api/billing/plans"),
      api.get("/api/billing/status"),
      api.get("/api/billing/invoices"),
    ]);
    if (pRes.status === "fulfilled") setPlans(pRes.value.data);
    if (bRes.status === "fulfilled") setBilling(bRes.value.data);
    if (iRes.status === "fulfilled") setInvoices(iRes.value.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelect = (plan, billingCycle) => {
    if (plan.id === "free") {
      if (!window.confirm("Downgrade to Free? You'll lose access to paid features immediately.")) return;
      api.post("/api/billing/downgrade").then(load);
      return;
    }
    setCheckout({ plan, cycle: billingCycle, price: plan.price[billingCycle] });
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel subscription? You keep access until the period ends.")) return;
    setCancelLoading(true);
    await api.post("/api/billing/cancel");
    await load();
    setCancelLoading(false);
  };

  const currentPlan = billing?.plan || user?.plan || "free";
  const orderedPlans = ["free","pro","enterprise"].map(id => plans[id]).filter(Boolean);

  const usagePct = (used, limit) => limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Plans & Billing</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your subscription and payment history</p>
      </div>

      {/* ── Current subscription card ── */}
      {billing && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${META[billing.plan]?.grad} flex items-center justify-center text-2xl`}>
                {META[billing.plan]?.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{billing.planName} Plan</h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize
                    ${billing.subscriptionStatus === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : billing.subscriptionStatus === "cancelled" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                    {billing.subscriptionStatus}
                  </span>
                </div>
                {billing.plan !== "free" ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {billing.billingCycle === "monthly" ? "Monthly" : "Yearly"} · Renews{" "}
                    {new Date(billing.currentPeriodEnd).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Free plan · No billing</p>
                )}
                {billing.subscriptionStatus === "cancelled" && (
                  <p className="text-sm text-orange-500 mt-0.5">
                    Access until {new Date(billing.currentPeriodEnd).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                  </p>
                )}
              </div>
            </div>
            {billing.subscriptionStatus === "active" && billing.plan !== "free" && (
              <button onClick={handleCancel} disabled={cancelLoading}
                className="text-sm text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-400 px-4 py-2 rounded-xl transition disabled:opacity-60">
                {cancelLoading ? "Cancelling…" : "Cancel Subscription"}
              </button>
            )}
          </div>

          {/* Usage progress bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
            {[
              { label:"Document Summaries", key:"summarize", icon:"📄" },
              { label:"Table Extractions",  key:"tables",    icon:"📊" },
            ].map(({ label, key, icon }) => {
              const u   = billing.usage?.[key] || {};
              const pct = usagePct(u.used || 0, u.limit || 5);
              const unlimited = u.limit === -1;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{icon} {label}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {unlimited ? `${u.used || 0} / ∞` : `${u.used || 0} / ${u.limit || 0}`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500
                      ${unlimited ? "bg-purple-500 w-[30%]" : pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-400" : "bg-blue-500"}`}
                      style={{ width: unlimited ? "30%" : `${pct}%` }}/>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {unlimited ? "Unlimited" : `${u.remaining || 0} remaining · resets daily at midnight`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {[["plans","📋 Plans"],["invoices","🧾 Payment History"]].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition
              ${activeTab === id ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ PLANS TAB ══ */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          {/* Billing cycle toggle */}
          <div className="flex items-center gap-4">
            <span className={`text-sm font-semibold ${cycle === "monthly" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>Monthly</span>
            <button onClick={() => setCycle(c => c === "monthly" ? "yearly" : "monthly")}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${cycle === "yearly" ? "bg-blue-600" : "bg-gray-400 dark:bg-gray-600"}`}>
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${cycle === "yearly" ? "left-8" : "left-1"}`}/>
            </button>
            <span className={`text-sm font-semibold ${cycle === "yearly" ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
              Yearly
            </span>
            {cycle === "yearly" && (
              <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-full">SAVE UP TO 25%</span>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {orderedPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} current={currentPlan}
                billing={billing} cycle={cycle} onSelect={handleSelect}/>
            ))}
          </div>

          {/* Comparison table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Full Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-semibold w-2/5">Feature</th>
                    {["Free","Pro","Enterprise"].map((p,i) => (
                      <th key={p} className={`text-center px-4 py-3 font-bold
                        ${i===1 ? "text-blue-600 dark:text-blue-400" : i===2 ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"}`}>
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {[
                    ["Summaries / day",            "5",        "15",         "Unlimited"],
                    ["Table extractions / day",    "5",        "15",         "Unlimited"],
                    ["Max file size",              "10 MB",    "50 MB",      "200 MB"],
                    ["History retention",          "30 days",  "1 year",     "Forever"],
                    ["All AI models",              "❌",       "✅",         "✅"],
                    ["Document Q&A chat",          "✅",       "✅",         "✅"],
                    ["Banking doc detection",      "✅",       "✅",         "✅"],
                    ["Priority AI processing",     "❌",       "✅",         "✅"],
                    ["Bulk processing",            "❌",       "❌",         "✅"],
                    ["Support",                    "Community","Email",      "Priority"],
                    ["Price / month",              "₹0",       "₹499",       "₹1,999"],
                    ["Price / year",               "₹0",       "₹4,499",     "₹17,999"],
                  ].map(([feat, ...vals]) => (
                    <tr key={feat} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{feat}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`text-center px-4 py-3 font-medium
                          ${v==="✅" ? "text-green-500" : v==="❌" ? "text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FAQ ── */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-5">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                ["What counts as one summary?","Each file you upload and summarize counts as one use, regardless of file size or document length."],
                ["Do unused limits roll over?","No — your summary and table limits reset daily at midnight. Billing (monthly or yearly) is separate and only affects your subscription price."],
                ["Can I switch plans anytime?","Yes. Upgrading takes effect immediately. Downgrading or cancelling takes effect at the end of the current period."],
                ["What payment methods are accepted?","UPI, debit/credit cards (Visa, Mastercard, RuPay), net banking, and wallets via Cashfree."],
                ["Is billing in INR?","Yes, all prices are in Indian Rupees (₹) including 18% GST."],
                ["Can I get a refund?","Refunds are handled on a case-by-case basis. Contact support within 7 days of payment."],
              ].map(([q, a]) => (
                <div key={q} className="space-y-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{q}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ INVOICES TAB ══ */}
      {activeTab === "invoices" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <span className="text-5xl">🧾</span>
              <p className="font-semibold text-gray-700 dark:text-gray-300">No payments yet</p>
              <p className="text-sm text-gray-400">Your payment history will appear here after your first payment.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-6 py-3.5 text-gray-500 dark:text-gray-400 font-semibold">Invoice</th>
                  <th className="text-left px-4 py-3.5 text-gray-500 dark:text-gray-400 font-semibold">Plan</th>
                  <th className="text-left px-4 py-3.5 text-gray-500 dark:text-gray-400 font-semibold">Date</th>
                  <th className="text-left px-4 py-3.5 text-gray-500 dark:text-gray-400 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3.5 text-gray-500 dark:text-gray-400 font-semibold">Status</th>
                  <th className="text-right px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs text-gray-600 dark:text-gray-400">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span>{META[inv.plan]?.icon}</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">{inv.plan}</span>
                        <span className="text-xs text-gray-400 capitalize">({inv.billingCycle})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400">
                      {new Date(inv.paidAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-800 dark:text-gray-200">
                      ₹{inv.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-bold">Paid</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button onClick={() => setViewInvoice(inv.id)}
                        className="text-blue-500 hover:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-900/20 transition">
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* ── Billing AI Chatbot ── */}
          <PlansBillingChatbot context="billing" billingInfo={billing} />
        </div>
      )}

      {/* ── Modals ── */}
      {checkout && (
        <CheckoutModal
          plan={checkout.plan}
          cycle={checkout.cycle}
          price={checkout.price}
          onClose={() => setCheckout(null)}
          onSuccess={() => { setCheckout(null); load(); }}
        />
      )}
      {viewInvoice && (
        <InvoiceModal invoiceId={viewInvoice} onClose={() => setViewInvoice(null)}/>
      )}
    </div>
  );
}