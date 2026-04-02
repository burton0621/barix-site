"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  getWeekDays,
  getMonthDays,
  addWeeks,
  addMonths,
  formatWeekRange,
  formatMonthYear,
} from "@/lib/utils/dateHelpers";
import WeekView from "./WeekView";
import MonthView from "./MonthView";
import DayPanel from "./DayPanel";
import AppointmentModal from "./AppointmentModal";
import GoogleConnectBanner from "./GoogleConnectBanner";
import styles from "./CalendarPage.module.css";

export default function CalendarPage() {
  const { session } = useAuth();
  const searchParams = useSearchParams();

  const [view, setView] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [panelDay, setPanelDay] = useState(null); // day whose appointments are shown in panel
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [googleToken, setGoogleToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [defaultSlot, setDefaultSlot] = useState(null);
  const [toast, setToast] = useState(null);

  const { from, to, weekDays, monthDays } = useMemo(() => {
    if (view === "week") {
      const days = getWeekDays(currentDate);
      const f = new Date(days[0]);
      f.setHours(0, 0, 0, 0);
      const t = new Date(days[6]);
      t.setHours(23, 59, 59, 999);
      return { from: f.toISOString(), to: t.toISOString(), weekDays: days, monthDays: null };
    } else {
      const days = getMonthDays(currentDate);
      const f = new Date(days[0]);
      f.setHours(0, 0, 0, 0);
      const t = new Date(days[days.length - 1]);
      t.setHours(23, 59, 59, 999);
      return { from: f.toISOString(), to: t.toISOString(), weekDays: null, monthDays: days };
    }
  }, [view, currentDate]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(
        `/api/calendar/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const json = await res.json();
      if (json.success) setAppointments(json.data);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    }
  }, [session, from, to]);

  const fetchGoogleToken = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("google_email, connected_at")
      .eq("user_id", session.user.id)
      .single();
    setGoogleToken(data || null);
  }, [session]);

  const fetchClients = useCallback(async () => {
    if (!session?.access_token) return;
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });
    setClients(data || []);
  }, [session]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchAppointments(), fetchGoogleToken(), fetchClients()]);
      setLoading(false);
      silentSync(); // auto-sync Google on load; no-op if not connected
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAppointments, fetchGoogleToken, fetchClients]);

  // Poll every 5 minutes while the page is open
  useEffect(() => {
    if (!session?.access_token) return;
    const interval = setInterval(() => silentSync(), 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (searchParams.get("connected") === "true" && session?.access_token) {
      silentSync();
      window.history.replaceState({}, "", "/calendar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, session]);

  async function silentSync() {
    if (!session?.access_token || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.success) {
        await fetchAppointments();
        await fetchGoogleToken();
      }
    } catch {
      // silent — don't interrupt the user
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Calendar? Appointments already synced will remain.")) return;
    try {
      const res = await fetch("/api/calendar/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setGoogleToken(null);
        showToast("Google Calendar disconnected.");
      }
    } catch {
      showToast("Failed to disconnect.", "error");
    }
  }

  function openNewModal(slot) {
    setEditingAppointment(null);
    setDefaultSlot(slot || null);
    setModalOpen(true);
  }

  function openEditModal(appointment) {
    setEditingAppointment(appointment);
    setDefaultSlot(null);
    setModalOpen(true);
  }

  function handleSaved() {
    setModalOpen(false);
    fetchAppointments();
    showToast(editingAppointment ? "Appointment updated." : "Appointment created.");
  }

  function handleDeleted(id) {
    setModalOpen(false);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    showToast("Appointment deleted.");
  }

  function navigatePrev() {
    setPanelDay(null);
    if (view === "week") setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate((d) => addMonths(d, -1));
  }

  function navigateNext() {
    setPanelDay(null);
    if (view === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
    setPanelDay(null);
  }

  function handleDayClick(day) {
    setPanelDay(day);
  }

  const periodLabel =
    view === "week" && weekDays
      ? formatWeekRange(weekDays[0])
      : formatMonthYear(currentDate);

  return (
    <div className={styles.pageWrapper}>
      <main className={styles.main}>
        {/* Page header */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Calendar</h1>
            <p className={styles.subtitle}>Schedule and manage appointments</p>
          </div>
          <button className={styles.newBtn} onClick={() => openNewModal(null)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Appointment
          </button>
        </div>

        {/* Only show banner when NOT connected — connected state auto-syncs silently */}
        {!googleToken && (
          <GoogleConnectBanner
            googleToken={googleToken}
            accessToken={session?.access_token}
            onDisconnect={handleDisconnect}
            syncing={syncing}
          />
        )}

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.navGroup}>
            <button className={styles.navBtn} onClick={navigatePrev} aria-label="Previous">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button className={styles.todayBtn} onClick={goToToday}>Today</button>
            <button className={styles.navBtn} onClick={navigateNext} aria-label="Next">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className={styles.periodLabel}>{periodLabel}</span>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === "week" ? styles.viewBtnActive : ""}`}
              onClick={() => { setView("week"); setPanelDay(null); }}
            >
              Week
            </button>
            <button
              className={`${styles.viewBtn} ${view === "month" ? styles.viewBtnActive : ""}`}
              onClick={() => { setView("month"); setPanelDay(null); }}
            >
              Month
            </button>
          </div>
        </div>

        {/* Calendar + Day panel */}
        <div className={`${styles.calendarArea} ${panelDay ? styles.withPanel : ""}`}>
          <div className={styles.calendarMain}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingSpinner} />
                <span>Loading calendar…</span>
              </div>
            ) : view === "week" && weekDays ? (
              <WeekView
                days={weekDays}
                appointments={appointments}
                onSlotClick={openNewModal}
                onAppointmentClick={openEditModal}
              />
            ) : monthDays ? (
              <MonthView
                calendarDays={monthDays}
                appointments={appointments}
                currentMonth={currentDate}
                panelDay={panelDay}
                onDayClick={handleDayClick}
                onAppointmentClick={openEditModal}
              />
            ) : null}
          </div>

          {/* Day detail panel */}
          {panelDay && (
            <DayPanel
              day={panelDay}
              appointments={appointments}
              onClose={() => setPanelDay(null)}
              onAddAppointment={() => openNewModal({ date: panelDay })}
              onAppointmentClick={openEditModal}
            />
          )}
        </div>
      </main>

      {/* Appointment modal */}
      <AppointmentModal
        open={modalOpen}
        appointment={editingAppointment}
        defaultDate={defaultSlot?.date}
        defaultHour={defaultSlot?.hour}
        clients={clients}
        session={session}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        onClose={() => setModalOpen(false)}
      />

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
