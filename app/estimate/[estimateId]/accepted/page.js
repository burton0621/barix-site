"use client";

/*
  Estimate Accepted Success Page
  ------------------------------
  Shown to clients after they successfully accept an estimate.
  Confirms the acceptance and explains next steps (they'll receive an invoice).
*/

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "../estimatePage.module.css";

export default function EstimateAcceptedPage() {
  const params = useParams();
  const estimateId = params.estimateId;

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch estimate details for display
  useEffect(() => {
    async function fetchEstimate() {
      try {
        const response = await fetch(`/api/estimate/${estimateId}`);
        const data = await response.json();

        if (response.ok) {
          setEstimate(data);
        }
      } catch (err) {
        console.error("Error fetching estimate:", err);
      } finally {
        setLoading(false);
      }
    }

    if (estimateId) {
      fetchEstimate();
    }
  }, [estimateId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.processedContainer}>
        {/* Success checkmark icon */}
        <div className={styles.processedIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22,4 12,14.01 9,11.01" />
          </svg>
        </div>

        <h1 className={styles.processedTitle}>Estimate Accepted!</h1>
        
        <p className={styles.processedText}>
          Thank you for accepting {estimate?.invoice_number || "the estimate"}. 
          We appreciate your business!
        </p>

        <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
          <h3 style={{ fontSize: "1rem", color: "#374151", marginBottom: "0.75rem" }}>
            What happens next?
          </h3>
          <ul style={{ 
            color: "#6b7280", 
            paddingLeft: "1.25rem",
            margin: 0,
            lineHeight: "1.8"
          }}>
            <li>An invoice will be created based on this estimate</li>
            <li>You will receive the invoice via email</li>
            <li>You can then pay the invoice online</li>
          </ul>
        </div>

        {/* Business contact info if available */}
        {estimate?.contractor && (
          <div style={{ 
            marginTop: "2rem", 
            padding: "1rem", 
            background: "#f9fafb", 
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
              Questions? Contact us:
            </p>
            <p style={{ margin: "0.5rem 0 0", fontWeight: "600", color: "#111827" }}>
              {estimate.contractor.business_name}
            </p>
            {estimate.contractor.email && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                {estimate.contractor.email}
              </p>
            )}
            {estimate.contractor.phone && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                {estimate.contractor.phone}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.footerText}>
          Powered by Barix
        </p>
      </div>
    </div>
  );
}



