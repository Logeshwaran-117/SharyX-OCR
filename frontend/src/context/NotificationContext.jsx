import { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persist = (list) => {
    setNotifications(list);
    try {
      localStorage.setItem("notifications", JSON.stringify(list));
    } catch {
      // ignore storage errors
    }
  };

  const addNotification = useCallback((notification) => {
    const newNotif = {
      id: Date.now() + Math.random(),
      title: notification.title || "Notification",
      message: notification.message || "",
      type: notification.type || "info", // info | success | error
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [newNotif, ...prev].slice(0, 50); // cap at 50
      try {
        localStorage.setItem("notifications", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem("notifications", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem("notifications", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem("notifications", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
 