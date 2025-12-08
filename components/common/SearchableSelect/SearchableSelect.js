"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SearchableSelect.module.css";

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const containerRef = useRef(null);

  // Keep input text in sync with outside value
  useEffect(() => {
    // Treat empty/undefined as "no selection"
    if (!value) {
      setText("");
      return;
    }

    const selected = options.find((opt) => opt.value === value) || null;
    if (selected) {
      setText(selected.label);
    } else {
      setText("");
    }
  }, [value, options]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const lowerText = text.toLowerCase();
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(lowerText)
  );

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.controlWrapper}>
        <input
          type="text"
          className={`${styles.controlInput} ${
            disabled ? styles.controlDisabled : ""
          }`}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!open && !disabled) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          disabled={disabled}
        />
        <button
          type="button"
          className={styles.chevronButton}
          onClick={() => {
            if (!disabled) setOpen((prev) => !prev);
          }}
          tabIndex={-1}
        >
          <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
        </button>
      </div>

      {open && !disabled && (
        <div className={styles.dropdown}>
          <div className={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div className={styles.noOptions}>No matches</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value || opt.label}
                  className={styles.option}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
