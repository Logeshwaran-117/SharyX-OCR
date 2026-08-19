import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";

function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeIcon = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
};

function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
  } = useNotifications();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-lg"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 z-50">
          <div className="flex justify-between items-center px-4 py-3 border-b dark:border-gray-700">
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Notifications</p>
            {notifications.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500 px-4">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${
                    !n.read ? "bg-blue-50/60 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <span className="text-lg">{typeIcon[n.type] || "ℹ️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
