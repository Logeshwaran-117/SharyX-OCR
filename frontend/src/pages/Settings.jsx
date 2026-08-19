import { useState } from "react";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, CreditCard, AlertTriangle, Bell, Key, Copy, RefreshCw, Check } from "lucide-react";

function Settings({ user, setIsAuthenticated }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("profile");

    // Profile state
    const [name, setName] = useState(user?.name || user?.displayName || "");
    const [profileMsg, setProfileMsg] = useState("");
    const [profileError, setProfileError] = useState("");

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // Delete state
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deleteError, setDeleteError] = useState("");

    // Notifications state
    const [notifPrefs, setNotifPrefs] = useState({
      summaryReady:   true,
      weeklyDigest:   true,
      usageAlerts:    true,
      productUpdates: false,
    });
    const [notifMsg, setNotifMsg] = useState("");

    async function handleSaveNotifications() {
      setNotifMsg("");
      try {
        await api.put("/auth/notification-preferences", notifPrefs);
        setNotifMsg("Notification preferences saved.");
      } catch {
        setNotifMsg("Saved locally (server endpoint not yet wired).");
      }
      setTimeout(() => setNotifMsg(""), 3000);
    }

    // API Keys state
    const [apiKeys, setApiKeys] = useState([]);
    const [apiKeyLoading, setApiKeyLoading] = useState(false);
    const [copiedKey, setCopiedKey] = useState(null);
    const canUseApiKeys = ["pro", "enterprise"].includes(user?.plan?.toLowerCase());

    async function generateApiKey() {
      setApiKeyLoading(true);
      try {
        const r = await api.post("/auth/api-keys");
        setApiKeys(prev => [r.data, ...prev]);
      } catch (err) {
        alert(err.response?.data?.message || "Failed to generate API key.");
      } finally {
        setApiKeyLoading(false);
      }
    }

    async function revokeApiKey(keyId) {
      if (!window.confirm("Revoke this API key? Apps using it will stop working immediately.")) return;
      try {
        await api.delete(`/auth/api-keys/${keyId}`);
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
      } catch { alert("Failed to revoke key."); }
    }

    function copyKey(key) {
      navigator.clipboard.writeText(key).then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      });
    }

    async function handleUpdateProfile() {
        setProfileMsg(""); setProfileError("");
        try {
            await api.put("/auth/update-profile", { name });
            setProfileMsg("Profile updated successfully!");
        } catch (err) {
            setProfileError(err.response?.data?.message || "Failed to update profile.");
        }
    }

    async function handleChangePassword() {
        setPasswordMsg(""); setPasswordError("");
        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            return;
        }
        try {
            await api.put("/auth/change-password", { currentPassword, newPassword });
            setPasswordMsg("Password changed successfully!");
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (err) {
            setPasswordError(err.response?.data?.message || "Failed to change password.");
        }
    }

    async function handleDeleteAccount() {
        if (deleteConfirm !== "DELETE") {
            setDeleteError("Type DELETE to confirm.");
            return;
        }
        try {
            await api.delete("/auth/delete-account");
            setIsAuthenticated(false);
            navigate("/login");
        } catch (err) {
            setDeleteError(err.response?.data?.message || "Failed to delete account.");
        }
    }

    const tabs = [
        { id: "profile",       label: "Profile",        icon: User          },
        { id: "password",      label: "Password",        icon: Lock          },
        { id: "notifications", label: "Notifications",   icon: Bell          },
        { id: "apikeys",       label: "API Keys",        icon: Key           },
        { id: "billing",       label: "Billing",         icon: CreditCard    },
        { id: "danger",        label: "Danger Zone",     icon: AlertTriangle },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>Settings</h1>
            <p className="mb-6" style={{ color: "var(--muted)" }}>Manage your account preferences</p>

            {/* Tabs — icon + label, no emoji */}
            <div className="flex gap-2 mb-6 border-b" style={{ borderColor: "var(--border)" }}>
                {tabs.map(tab => {
                    const TabIcon = tab.icon;
                    const active = activeTab === tab.id;
                    const isDanger = tab.id === "danger";
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition -mb-px"
                            style={
                                active
                                    ? {
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderBottomColor: "var(--card)",
                                        color: isDanger ? "var(--danger)" : "var(--primary)",
                                      }
                                    : { color: "var(--muted)" }
                            }
                        >
                            <TabIcon
                                size={13}
                                style={{ color: active && isDanger ? "var(--danger)" : undefined }}
                            />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
                <div className="rounded-2xl shadow p-6 space-y-5 transition-colors duration-300"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                            style={{ background: "var(--primary)" }}>
                            {name ? name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                            <p className="font-semibold" style={{ color: "var(--text)" }}>{name || "User"}</p>
                            <p className="text-sm" style={{ color: "var(--muted)" }}>{user?.email}</p>
                            {user?.googleId && (
                                <span className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(var(--primary-rgb),.1)", color: "var(--primary)" }}>
                                    Google Account
                                </span>
                            )}
                        </div>
                    </div>

                    {profileMsg && (
                        <p className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "var(--success)", background: "rgba(16,185,129,.1)" }}>
                            {profileMsg}
                        </p>
                    )}
                    {profileError && (
                        <p className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "var(--danger)", background: "rgba(239,68,68,.1)" }}>
                            {profileError}
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded-lg p-3 focus:outline-none focus:ring-2 text-sm"
                            style={{
                                border: "1px solid var(--border)",
                                background: "var(--secondary)",
                                color: "var(--text)",
                                "--tw-ring-color": "var(--primary)",
                            }}
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>Email</label>
                        <input
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="w-full rounded-lg p-3 text-sm cursor-not-allowed"
                            style={{ border: "1px solid var(--border)", background: "var(--secondary)", color: "var(--muted)" }}
                        />
                        <p className="text-xs mt-1" style={{ color: "var(--muted)", opacity: 0.7 }}>
                            Email cannot be changed.
                        </p>
                    </div>

                    <button
                        onClick={handleUpdateProfile}
                        className="w-full py-3 rounded-lg text-white font-medium transition hover:opacity-90"
                        style={{ background: "var(--primary)" }}
                    >
                        Save Changes
                    </button>
                </div>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
                <div className="rounded-2xl shadow p-6 space-y-5 transition-colors duration-300"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Change Password</h2>

                    {user?.googleId && !user?.password && (
                        <div className="rounded-lg p-4 text-sm"
                            style={{ background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "var(--warning)" }}>
                            You signed up with Google. You can set a password to also enable email login.
                        </div>
                    )}

                    {passwordMsg && (
                        <p className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "var(--success)", background: "rgba(16,185,129,.1)" }}>
                            {passwordMsg}
                        </p>
                    )}
                    {passwordError && (
                        <p className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "var(--danger)", background: "rgba(239,68,68,.1)" }}>
                            {passwordError}
                        </p>
                    )}

                    {[
                        { label: "Current Password", value: currentPassword, setter: setCurrentPassword, placeholder: "Current password" },
                        { label: "New Password",     value: newPassword,     setter: setNewPassword,     placeholder: "New password"     },
                        { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, placeholder: "Confirm new password" },
                    ].map(({ label, value, setter, placeholder }) => (
                        <div key={label}>
                            <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                            <input
                                type="password"
                                value={value}
                                onChange={e => setter(e.target.value)}
                                className="w-full rounded-lg p-3 focus:outline-none focus:ring-2 text-sm"
                                style={{
                                    border: "1px solid var(--border)",
                                    background: "var(--secondary)",
                                    color: "var(--text)",
                                }}
                                placeholder={placeholder}
                            />
                        </div>
                    ))}

                    <button
                        onClick={handleChangePassword}
                        className="w-full py-3 rounded-lg text-white font-medium transition hover:opacity-90"
                        style={{ background: "var(--primary)" }}
                    >
                        Update Password
                    </button>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
                <div className="rounded-2xl shadow p-6 space-y-5 transition-colors duration-300"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Email Notifications</h2>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                        Choose which emails SharyX sends you.
                    </p>

                    {notifMsg && (
                        <p className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "var(--success)", background: "rgba(16,185,129,.1)" }}>
                            {notifMsg}
                        </p>
                    )}

                    <div className="space-y-4">
                        {[
                            { key: "summaryReady",   label: "Summary ready",      desc: "Email me when a document finishes processing" },
                            { key: "weeklyDigest",   label: "Weekly digest",       desc: "A weekly summary of your activity and usage" },
                            { key: "usageAlerts",    label: "Usage alerts",        desc: "Warn me when I'm close to my daily limit" },
                            { key: "productUpdates", label: "Product updates",     desc: "New features, improvements, and announcements" },
                        ].map(({ key, label, desc }) => (
                            <label key={key} className="flex items-start justify-between gap-4 cursor-pointer group">
                                <div>
                                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{desc}</p>
                                </div>
                                {/* Toggle */}
                                <div
                                    onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                                    className="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer mt-0.5"
                                    style={{ background: notifPrefs[key] ? "var(--primary)" : "var(--border)" }}
                                >
                                    <span
                                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                                        style={{ left: notifPrefs[key] ? "calc(100% - 20px)" : "4px" }}
                                    />
                                </div>
                            </label>
                        ))}
                    </div>

                    <button
                        onClick={handleSaveNotifications}
                        className="w-full py-3 rounded-lg text-white font-medium transition hover:opacity-90"
                        style={{ background: "var(--primary)" }}
                    >
                        Save Preferences
                    </button>
                </div>
            )}

            {/* API Keys Tab */}
            {activeTab === "apikeys" && (
                <div className="rounded-2xl shadow p-6 space-y-5 transition-colors duration-300"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>API Keys</h2>
                            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                                Use these keys to access SharyX from your own apps or scripts.
                            </p>
                        </div>
                        {canUseApiKeys && (
                            <button
                                onClick={generateApiKey}
                                disabled={apiKeyLoading}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                                style={{ background: "var(--primary)" }}
                            >
                                <RefreshCw size={13} className={apiKeyLoading ? "animate-spin" : ""} />
                                {apiKeyLoading ? "Generating…" : "New key"}
                            </button>
                        )}
                    </div>

                    {!canUseApiKeys && (
                        <div className="rounded-xl p-4 flex items-start gap-3"
                            style={{ background: "rgba(var(--primary-rgb),.07)", border: "1px solid rgba(var(--primary-rgb),.15)" }}>
                            <Key size={16} style={{ color: "var(--primary)", marginTop: 2, flexShrink: 0 }} />
                            <div>
                                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pro or Enterprise required</p>
                                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                                    API access is available on Pro and Enterprise plans.
                                </p>
                            </div>
                        </div>
                    )}

                    {canUseApiKeys && apiKeys.length === 0 && (
                        <div className="rounded-xl p-6 text-center"
                            style={{ background: "var(--secondary)", border: "1px dashed var(--border)" }}>
                            <Key size={20} className="mx-auto mb-2" style={{ color: "var(--muted)" }} />
                            <p className="text-sm" style={{ color: "var(--muted)" }}>
                                No API keys yet. Generate one above to get started.
                            </p>
                        </div>
                    )}

                    {apiKeys.map((k) => (
                        <div key={k.id} className="rounded-xl p-4 flex items-center gap-3"
                            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                            <Key size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                            <code className="flex-1 text-xs font-mono truncate" style={{ color: "var(--text)" }}>
                                {k.key}
                            </code>
                            <button
                                onClick={() => copyKey(k.key)}
                                className="shrink-0 p-1.5 rounded-lg transition hover:opacity-70"
                                style={{ color: "var(--muted)" }}
                                title="Copy key"
                            >
                                {copiedKey === k.key ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                            </button>
                            <button
                                onClick={() => revokeApiKey(k.id)}
                                className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition hover:opacity-80"
                                style={{ background: "rgba(239,68,68,.1)", color: "var(--danger)" }}
                            >
                                Revoke
                            </button>
                        </div>
                    ))}

                    <p className="text-xs" style={{ color: "var(--muted)", opacity: 0.7 }}>
                        Keep API keys secret. They grant full access to your account. Revoke any key you don't recognize immediately.
                    </p>
                </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
                <div className="rounded-2xl shadow p-6 space-y-5 transition-colors duration-300"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Billing &amp; Plan</h2>
                        <Link to="/pricing"
                            className="text-sm px-4 py-2 rounded-xl font-medium text-white transition hover:opacity-90"
                            style={{ background: "var(--primary)" }}>
                            Manage Plan →
                        </Link>
                    </div>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                        View your current plan, usage limits, and upgrade options on the Plans &amp; Billing page.
                    </p>
                    <div className="rounded-xl p-4 flex items-center gap-3"
                        style={{ background: "var(--secondary)" }}>
                        <CreditCard size={20} style={{ color: "var(--primary)" }} />
                        <div>
                            <p className="font-semibold capitalize" style={{ color: "var(--text)" }}>
                                {user?.plan || "Free"} Plan
                            </p>
                            <p className="text-xs" style={{ color: "var(--muted)" }}>
                                Click "Manage Plan" to see usage and upgrade
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
                <div className="rounded-2xl shadow p-6 space-y-5 transition-colors duration-300"
                    style={{
                        background: "var(--card)",
                        border: "1px solid rgba(239,68,68,.3)",
                    }}>
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
                        <h2 className="text-lg font-semibold" style={{ color: "var(--danger)" }}>Danger Zone</h2>
                    </div>
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                        Deleting your account is permanent. All your documents, summaries, and history will be erased and cannot be recovered.
                    </p>

                    {deleteError && (
                        <p className="px-4 py-2 rounded-lg text-sm"
                            style={{ color: "var(--danger)", background: "rgba(239,68,68,.1)" }}>
                            {deleteError}
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
                            Type <span className="font-bold" style={{ color: "var(--danger)" }}>DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            className="w-full rounded-lg p-3 focus:outline-none focus:ring-2 text-sm"
                            style={{
                                border: "1px solid rgba(239,68,68,.4)",
                                background: "var(--secondary)",
                                color: "var(--text)",
                            }}
                            placeholder="Type DELETE"
                        />
                    </div>

                    <button
                        onClick={handleDeleteAccount}
                        className="w-full py-3 rounded-lg text-white font-medium transition hover:opacity-90"
                        style={{ background: "var(--danger)" }}
                    >
                        Delete My Account
                    </button>
                </div>
            )}
        </div>
    );
}

export default Settings;