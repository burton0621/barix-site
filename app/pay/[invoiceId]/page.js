"use client";

/*
  Public Invoice Payment Page
  ---------------------------
  This is the page clients see when they click "Pay Invoice" from an email.
  It shows the invoice summary and a button to pay via Stripe.
  
  This page is PUBLIC - no authentication required.
  The invoice ID in the URL acts as a secure token.
*/

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Toast from "@/components/common/Toast/Toast";
import styles from "./paymentPage.module.css";

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.invoiceId;
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);
  
  // Toast notification state for user-friendly feedback
  const [toast, setToast] = useState({ open: false, message: "", type: "error" });
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };

  // Check if user canceled payment
  const wasCanceled = searchParams.get("canceled") === "true";

  // Fetch invoice details on mount
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/invoice/${invoiceId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invoice not found");
          setLoading(false);
          return;
        }

        setInvoice(data.invoice);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  // Handle Pay Now button click
  const handlePayNow = async () => {
    setPaying(true);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to start payment");
        setPaying(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("Payment error:", err);
      showToast("Failed to start payment. Please try again.");
      setPaying(false);
    }
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingBox}>
            <p>Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBox}>
            <h1 className={styles.errorTitle}>Invoice Not Found</h1>
            <p className={styles.errorText}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Already paid state
  if (invoice?.status === "paid") {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successBox}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className={styles.successTitle}>Invoice Paid</h1>
            <p className={styles.successText}>
              Thank you! This invoice has already been paid.
            </p>
            <div className={styles.invoiceNumber}>
              Invoice #{invoice.invoice_number}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast notification for user-friendly feedback */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>Invoice</h1>
            <div className={styles.invoiceNumber}>#{invoice?.invoice_number}</div>
          </div>

          {/* Canceled message */}
          {wasCanceled && (
            <div className={styles.canceledBanner}>
              Payment was canceled. You can try again when ready.
            </div>
          )}

        {/* Invoice Card */}
        <div className={styles.card}>
          {/* Business & Client Info */}
          <div className={styles.infoGrid}>
            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>From</div>
              <div className={styles.infoValue}>
                {invoice?.contractor_profiles?.business_name || "Service Provider"}
              </div>
            </div>
            <div className={styles.infoBlock}>
              <div className={styles.infoLabel}>Bill To</div>
              <div className={styles.infoValue}>
                {invoice?.clients?.name || "Customer"}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className={styles.dateGrid}>
            <div className={styles.dateBlock}>
              <div className={styles.dateLabel}>Issue Date</div>
              <div className={styles.dateValue}>{formatDate(invoice?.issue_date)}</div>
            </div>
            <div className={styles.dateBlock}>
              <div className={styles.dateLabel}>Due Date</div>
              <div className={styles.dateValue}>{formatDate(invoice?.due_date)}</div>
            </div>
          </div>

          {/* Line Items */}
          {invoice?.line_items && invoice.line_items.length > 0 && (
            <div className={styles.lineItemsSection}>
              <h3 className={styles.sectionTitle}>Services</h3>
              <div className={styles.lineItemsTable}>
                {invoice.line_items.map((item, index) => (
                  <div key={index} className={styles.lineItem}>
                    <div className={styles.lineItemInfo}>
                      <div className={styles.lineItemName}>{item.name}</div>
                      {item.description && (
                        <div className={styles.lineItemDesc}>{item.description}</div>
                      )}
                    </div>
                    <div className={styles.lineItemAmount}>
                      {formatCurrency(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className={styles.totalsSection}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(invoice?.subtotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Tax ({((invoice?.tax_rate || 0) * 100).toFixed(0)}%)</span>
              <span>{formatCurrency(invoice?.tax_amount)}</span>
            </div>
            <div className={styles.totalRowFinal}>
              <span>Total Due</span>
              <span>{formatCurrency(invoice?.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice?.notes && (
            <div className={styles.notesSection}>
              <div className={styles.notesLabel}>Note from provider:</div>
              <div className={styles.notesText}>{invoice.notes}</div>
            </div>
          )}
        </div>

        {/* Pay Button */}
        <button
          className={styles.payButton}
          onClick={handlePayNow}
          disabled={paying}
        >
          {paying ? "Redirecting to payment..." : `Pay ${formatCurrency(invoice?.total)}`}
        </button>

        {/* Security Note */}
        <p className={styles.securityNote}>
          Secure payment powered by Stripe
        </p>
      </div>
    </div>
    </>
  );
}




