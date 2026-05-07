"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./FeedbackButton.module.css";

export default function FeedbackButton() {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) setUser(user || null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter feedback before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      page_path: pathname,
      message: message.trim(),
    });

    setSubmitting(false);

    if (error) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setMessage("");
    setSuccess(true);

    setTimeout(() => {
      setSuccess(false);
      setOpen(false);
    }, 1200);
  }

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        className={styles.feedbackButton}
        onClick={() => setOpen(true)}
      >
        Feedback
      </button>

      {open && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.header}>
              <h2>Send feedback</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <p className={styles.helpText}>
              Let us know what is working, broken, confusing, or missing.
            </p>

            <form onSubmit={handleSubmit}>
              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your feedback here..."
                rows={5}
              />

              {error ? <p className={styles.error}>{error}</p> : null}
              {success ? <p className={styles.success}>Feedback sent!</p> : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}