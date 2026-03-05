"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SERVICE_TEMPLATES, AVAILABLE_TRADES, TRADE_ICONS } from "@/lib/serviceTemplates";
import styles from "./QuickAddServicesModal.module.css";

export default function QuickAddServicesModal({ open, onClose, onServicesAdded }) {
  const [step, setStep] = useState(1); // 1 = select trade, 2 = select services
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [isCustomTrade, setIsCustomTrade] = useState(false);
  const [customTradeName, setCustomTradeName] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const resetModal = () => {
    setStep(1);
    setSelectedTrade(null);
    setIsCustomTrade(false);
    setCustomTradeName("");
    setSelectedServices([]);
    setSaving(false);
    setError("");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleTradeSelect = (trade) => {
    if (trade === "Other") {
      setIsCustomTrade(true);
      setSelectedTrade(null);
    } else {
      setIsCustomTrade(false);
      setSelectedTrade(trade);
      setSelectedServices([]); // Reset selections when changing trade
      setStep(2);
    }
  };

  const handleCustomTradeSubmit = async () => {
    if (!customTradeName.trim()) {
      setError("Please enter your trade/business type");
      return;
    }

    // Save the custom trade request to the database for future analysis
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from("trade_requests").insert({
          user_id: userData.user.id,
          trade_name: customTradeName.trim(),
        });
      }
    } catch (err) {
      console.error("Error saving trade request:", err);
      // Don't block the user, just log the error
    }

    // Show a message and close - they'll add services manually
    setError("");
    alert(`Thanks for letting us know! We've noted "${customTradeName}" and will add templates for this trade in a future update. For now, you can add your services manually.`);
    handleClose();
  };

  const handleServiceToggle = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.name === service.name);
      if (exists) {
        return prev.filter((s) => s.name !== service.name);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleSelectAll = () => {
    const tradeServices = SERVICE_TEMPLATES[selectedTrade] || [];
    if (selectedServices.length === tradeServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices([...tradeServices]);
    }
  };

  const handleAddServices = async () => {
    if (selectedServices.length === 0) {
      setError("Please select at least one service to add");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        setError("You must be logged in to add services");
        setSaving(false);
        return;
      }

      const servicesToInsert = selectedServices.map((service) => ({
        owner_id: userData.user.id,
        name: service.name,
        default_rate: service.default_rate,
        description: service.description,
      }));

      const { data: insertedServices, error: insertError } = await supabase
        .from("services")
        .insert(servicesToInsert)
        .select("*");

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(`Error adding services: ${insertError.message}`);
        setSaving(false);
        return;
      }

      onServicesAdded?.(insertedServices);
      handleClose();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(`Unexpected error: ${err.message}`);
      setSaving(false);
    }
  };

  const formatRate = (rate) => {
    return rate.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  const tradeServices = SERVICE_TEMPLATES[selectedTrade] || [];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              {step === 1 ? "Quick Add Services" : `${selectedTrade} Services`}
            </h2>
            <p className={styles.subtitle}>
              {step === 1
                ? "Select your trade to get started with pre-built services"
                : "Select the services you want to add to your catalog"}
            </p>
          </div>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={saving}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {error && <div className={styles.error}>{error}</div>}

          {/* Step 1: Trade Selection */}
          {step === 1 && !isCustomTrade && (
            <div className={styles.tradeGrid}>
              {AVAILABLE_TRADES.map((trade) => (
                <button
                  key={trade}
                  className={styles.tradeCard}
                  onClick={() => handleTradeSelect(trade)}
                >
                  <span className={styles.tradeIcon}>{TRADE_ICONS[trade]}</span>
                  <span className={styles.tradeName}>{trade}</span>
                  <span className={styles.tradeCount}>
                    {SERVICE_TEMPLATES[trade]?.length || 0} services
                  </span>
                </button>
              ))}
              
              {/* Other option */}
              <button
                className={`${styles.tradeCard} ${styles.otherCard}`}
                onClick={() => handleTradeSelect("Other")}
              >
                <span className={styles.tradeIcon}>{TRADE_ICONS["Other"]}</span>
                <span className={styles.tradeName}>Other</span>
                <span className={styles.tradeCount}>Custom trade</span>
              </button>
            </div>
          )}

          {/* Custom Trade Input */}
          {step === 1 && isCustomTrade && (
            <div className={styles.customTradeSection}>
              <button
                className={styles.backButton}
                onClick={() => setIsCustomTrade(false)}
              >
                ← Back to trades
              </button>
              
              <div className={styles.customTradeForm}>
                <label className={styles.label}>
                  What type of work do you do?
                </label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Pool Cleaning, Window Tinting, Locksmith..."
                  value={customTradeName}
                  onChange={(e) => setCustomTradeName(e.target.value)}
                  autoFocus
                />
                <p className={styles.hint}>
                  We'll save your trade type and add pre-built services for it in a future update.
                  For now, you can add your services manually.
                </p>
                <button
                  className={styles.submitButton}
                  onClick={handleCustomTradeSubmit}
                >
                  Submit & Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Service Selection */}
          {step === 2 && (
            <>
              <div className={styles.serviceHeader}>
                <button
                  className={styles.backButton}
                  onClick={() => setStep(1)}
                  disabled={saving}
                >
                  ← Back to trades
                </button>
                <button
                  className={styles.selectAllButton}
                  onClick={handleSelectAll}
                  disabled={saving}
                >
                  {selectedServices.length === tradeServices.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className={styles.serviceList}>
                {tradeServices.map((service) => {
                  const isSelected = selectedServices.some(
                    (s) => s.name === service.name
                  );
                  return (
                    <div
                      key={service.name}
                      className={`${styles.serviceCard} ${
                        isSelected ? styles.serviceCardSelected : ""
                      }`}
                      onClick={() => !saving && handleServiceToggle(service)}
                    >
                      <div className={styles.serviceCheckbox}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          disabled={saving}
                        />
                      </div>
                      <div className={styles.serviceInfo}>
                        <div className={styles.serviceName}>{service.name}</div>
                        <div className={styles.serviceDescription}>
                          {service.description}
                        </div>
                      </div>
                      <div className={styles.serviceRate}>
                        {formatRate(service.default_rate)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className={styles.footer}>
            <div className={styles.selectedCount}>
              {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""} selected
            </div>
            <div className={styles.footerActions}>
              <button
                className={styles.cancelButton}
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={styles.addButton}
                onClick={handleAddServices}
                disabled={saving || selectedServices.length === 0}
              >
                {saving
                  ? "Adding..."
                  : `Add ${selectedServices.length} Service${
                      selectedServices.length !== 1 ? "s" : ""
                    }`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
