import { useEffect, useState } from "react";

export function ErrorToast() {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    function handleNotification(event) {
      setNotification({
        message: event.detail?.message ?? "Error occurred",
        type: event.detail?.type ?? "error"
      });
      window.clearTimeout(handleNotification.timeoutId);
      handleNotification.timeoutId = window.setTimeout(() => setNotification(null), 5000);
    }

    window.addEventListener("app:error", handleNotification);
    window.addEventListener("app:notice", handleNotification);
    return () => {
      window.removeEventListener("app:error", handleNotification);
      window.removeEventListener("app:notice", handleNotification);
      window.clearTimeout(handleNotification.timeoutId);
    };
  }, []);

  if (!notification) {
    return null;
  }

  return (
    <div className={`toast toast-${notification.type}`} role="alert">
      {notification.message}
    </div>
  );
}
