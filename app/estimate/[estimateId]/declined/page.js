"use client";

/*
  Estimate Declined Page
  ----------------------
  Shown to clients after they decline an estimate.
  Simple confirmation with contact information for follow-up.
*/

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "../estimatePage.module.css";

export default function EstimateDeclinedPage() {
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
        {/* X icon for declined */}
        <div className={styles.processedIconDeclined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h1 className={styles.processedTitle}>Estimate Declined</h1>
        
        <p className={styles.processedText}>
          You have declined {estimate?.invoice_number || "this estimate"}. 
          We understand and appreciate you taking the time to review it.
        </p>

        <p style={{ 
          marginTop: "1rem", 
          fontSize: "0.9375rem", 
          color: "#6b7280",
          lineHeight: "1.6"
        }}>
          If you have any questions or would like to discuss alternative options, 
          please don't hesitate to reach out to us.
        </p>

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
              Want to discuss further? Contact us:
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



