"use client";

/*
  Public Estimate View Page
  -------------------------
  This page is accessible to clients via a link in their email.
  They can view the estimate details and either accept or decline it.
  
  When accepted:
  - The estimate status changes to "accepted"
  - A new invoice is created from the estimate with status "pending"
  - The business owner will see the pending invoice and can send it to the client
*/

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Toast from "@/components/common/Toast/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog/ConfirmDialog";
import styles from "./estimatePage.module.css";

export default function EstimatePage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params.estimateId;

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Toast notification state for user-friendly feedback
  const [toast, setToast] = useState({ open: false, message: "", type: "error" });
  
  // Decline confirmation dialog state
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  
  // Helper to show toast notifications
  const showToast = (message, type = "error") => {
    setToast({ open: true, message, type });
  };

  // Fetch estimate details on mount
  useEffect(() => {
    async function fetchEstimate() {
      try {
        const response = await fetch(`/api/estimate/${estimateId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Estimate not found");
          return;
        }

        // Check if this is actually an estimate
        if (data.document_type !== "estimate") {
          setError("This document is not an estimate");
          return;
        }

        setEstimate(data);
      } catch (err) {
        console.error("Error fetching estimate:", err);
        setError("Failed to load estimate");
      } finally {
        setLoading(false);
      }
    }

    if (estimateId) {
      fetchEstimate();
    }
  }, [estimateId]);

  // Handle accepting the estimate
  async function handleAccept() {
    if (processing) return;
    setProcessing(true);

    try {
      const response = await fetch(`/api/estimate/${estimateId}/accept`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to accept estimate");
        return;
      }

      // Redirect to success page
      router.push(`/estimate/${estimateId}/accepted`);
    } catch (err) {
      console.error("Error accepting estimate:", err);
      showToast("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  // Shows the decline confirmation dialog
  function handleDeclineClick() {
    if (processing) return;
    setShowDeclineConfirm(true);
  }

  // Handle declining the estimate after confirmation
  async function handleConfirmDecline() {
    setShowDeclineConfirm(false);

    setProcessing(true);

    try {
      const response = await fetch(`/api/estimate/${estimateId}/decline`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Failed to decline estimate");
        return;
      }

      // Redirect to declined page
      router.push(`/estimate/${estimateId}/declined`);
    } catch (err) {
      console.error("Error declining estimate:", err);
      showToast("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading estimate...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>Oops!</h1>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  // Already processed - show appropriate message
  if (estimate.status === "accepted") {
    return (
      <div className={styles.page}>
        <div className={styles.processedContainer}>
          <div className={styles.processedIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
          </div>
          <h1 className={styles.processedTitle}>Estimate Already Accepted</h1>
          <p className={styles.processedText}>
            This estimate has already been accepted. You should receive an invoice shortly.
          </p>
        </div>
      </div>
    );
  }

  if (estimate.status === "declined") {
    return (
      <div className={styles.page}>
        <div className={styles.processedContainer}>
          <div className={styles.processedIconDeclined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className={styles.processedTitle}>Estimate Declined</h1>
          <p className={styles.processedText}>
            This estimate has been declined. If you have questions, please contact us.
          </p>
        </div>
      </div>
    );
  }

  // Main estimate view
  return (
    <>
      {/* Toast notification for user-friendly feedback */}
      <Toast 
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      
      {/* Decline confirmation dialog */}
      <ConfirmDialog
        open={showDeclineConfirm}
        title="Decline Estimate?"
        message="Are you sure you want to decline this estimate? This action cannot be undone."
        confirmLabel="Yes, Decline"
        cancelLabel="Cancel"
        confirmType="danger"
        onConfirm={handleConfirmDecline}
        onCancel={() => setShowDeclineConfirm(false)}
      />
      
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header with business info */}
          <div className={styles.header}>
          <div className={styles.businessInfo}>
            <h1 className={styles.businessName}>
              {estimate.contractor?.business_name || "Business Name"}
            </h1>
            {estimate.contractor?.email && (
              <p className={styles.contactInfo}>{estimate.contractor.email}</p>
            )}
            {estimate.contractor?.phone && (
              <p className={styles.contactInfo}>{estimate.contractor.phone}</p>
            )}
          </div>
          <div className={styles.estimateLabel}>
            <span className={styles.estimateTag}>ESTIMATE</span>
            <span className={styles.estimateNumber}>{estimate.invoice_number}</span>
          </div>
        </div>

        {/* Client and date info */}
        <div className={styles.metaSection}>
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Prepared For</p>
            <p className={styles.metaValue}>{estimate.client?.name || "Client"}</p>
            {estimate.client?.email && (
              <p className={styles.metaSubValue}>{estimate.client.email}</p>
            )}
          </div>
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Date</p>
            <p className={styles.metaValue}>
              {new Date(estimate.issue_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className={styles.metaBlock}>
            <p className={styles.metaLabel}>Valid Until</p>
            <p className={styles.metaValue}>
              {new Date(estimate.due_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Line items table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Description</th>
                <th className={styles.thRight}>Qty</th>
                <th className={styles.thRight}>Rate</th>
                <th className={styles.thRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {estimate.line_items?.map((item, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td className={styles.td}>
                    <div className={styles.itemName}>{item.name}</div>
                    {item.description && (
                      <div className={styles.itemDescription}>{item.description}</div>
                    )}
                  </td>
                  <td className={styles.tdRight}>{item.quantity}</td>
                  <td className={styles.tdRight}>${parseFloat(item.rate).toFixed(2)}</td>
                  <td className={styles.tdRight}>${parseFloat(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals section */}
        <div className={styles.totalsSection}>
          <div className={styles.totalsContainer}>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>Subtotal</span>
              <span className={styles.totalsValue}>
                ${parseFloat(estimate.subtotal || 0).toFixed(2)}
              </span>
            </div>
            <div className={styles.totalsRow}>
              <span className={styles.totalsLabel}>
                Tax ({((estimate.tax_rate || 0) * 100).toFixed(0)}%)
              </span>
              <span className={styles.totalsValue}>
                ${parseFloat(estimate.tax_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className={styles.totalsFinal}>
              <span className={styles.totalsFinalLabel}>Total</span>
              <span className={styles.totalsFinalValue}>
                ${parseFloat(estimate.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes if any */}
        {estimate.notes && (
          <div className={styles.notesSection}>
            <h3 className={styles.notesTitle}>Notes</h3>
            <p className={styles.notesText}>{estimate.notes}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className={styles.actionsSection}>
          <p className={styles.actionsPrompt}>
            Would you like to proceed with this estimate?
          </p>
          <div className={styles.actionButtons}>
            <button
              className={styles.declineButton}
              onClick={handleDeclineClick}
              disabled={processing}
            >
              {processing ? "Processing..." : "Decline Estimate"}
            </button>
            <button
              className={styles.acceptButton}
              onClick={handleAccept}
              disabled={processing}
            >
              {processing ? "Processing..." : "Accept Estimate"}
            </button>
          </div>
          <p className={styles.actionsNote}>
            By accepting, you agree to the terms and will receive an invoice for payment.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.footerText}>
          Powered by Barix
        </p>
      </div>
    </div>
    </>
  );
}



