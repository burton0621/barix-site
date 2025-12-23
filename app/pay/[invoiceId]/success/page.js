"use client";

/*
  Payment Success Page
  --------------------
  Shown after a successful Stripe payment.
  Displays a thank you message and payment confirmation.
*/

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./successPage.module.css";

export default function PaymentSuccessPage() {
  const params = useParams();
  const invoiceId = params.invoiceId;
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function markPaidAndFetch() {
      try {
        // First, mark the invoice as paid (fallback when webhooks aren't set up)
        // Get session_id from URL if Stripe added it
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");

        await fetch(`/api/invoice/${invoiceId}/mark-paid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        // Then fetch the updated invoice
        const response = await fetch(`/api/invoice/${invoiceId}`);
        const data = await response.json();
        if (response.ok) {
          setInvoice(data.invoice);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      markPaidAndFetch();
    }
  }, [invoiceId]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingBox}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          {/* Success Icon */}
          <div className={styles.iconWrapper}>
            <div className={styles.iconCircle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className={styles.title}>Payment Successful!</h1>
          <p className={styles.subtitle}>
            Thank you for your payment. A confirmation has been sent to your email.
          </p>

          {/* Invoice Details */}
          {invoice && (
            <div className={styles.detailsBox}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Invoice</span>
                <span className={styles.detailValue}>#{invoice.invoice_number}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Amount Paid</span>
                <span className={styles.detailValue}>{formatCurrency(invoice.total)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.statusBadge}>Paid</span>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <p className={styles.footerNote}>
            If you have any questions, please contact your service provider.
          </p>
        </div>
      </div>
    </div>
  );
}

