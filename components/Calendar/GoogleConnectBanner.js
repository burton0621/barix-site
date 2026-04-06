"use client";

import styles from "./GoogleConnectBanner.module.css";

export default function GoogleConnectBanner({
  googleToken,
  accessToken,
  onSyncNow,
  onDisconnect,
  syncing,
}) {
  function handleConnect() {
    window.location.href = `/api/calendar/oauth/initiate?token=${encodeURIComponent(accessToken)}`;
  }

  if (googleToken) {
    return (
      <div className={styles.connectedBar}>
        <div className={styles.connectedLeft}>
          <svg className={styles.googleIcon} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className={styles.connectedText}>
            Google Calendar connected
            {googleToken.google_email && (
              <span className={styles.connectedEmail}> · {googleToken.google_email}</span>
            )}
          </span>
        </div>
        <div className={styles.connectedActions}>
          <button
            className={styles.syncBtn}
            onClick={onSyncNow}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
          <button className={styles.disconnectBtn} onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerLeft}>
        <svg className={styles.googleIconLarge} viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <div>
          <p className={styles.bannerTitle}>Connect Google Calendar</p>
          <p className={styles.bannerDesc}>
            Sync appointments between Barix and your Google Calendar automatically.
          </p>
        </div>
      </div>
      <button className={styles.connectBtn} onClick={handleConnect}>
        Connect Google Calendar
      </button>
    </div>
  );
}
