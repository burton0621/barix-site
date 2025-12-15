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
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Derive the label for the current value (for the display-only control)
  const selectedOption =
    options.find((opt) => opt.value === value) || null;
  const displayLabel = selectedOption ? selectedOption.label : "";

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
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

  // When dropdown opens, reset search + focus search box
  useEffect(() => {
    if (open) {
      setSearch("");
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [open]);

  const lowerSearch = search.toLowerCase();
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(lowerSearch)
  );

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Display-only control */}
      <div className={styles.controlWrapper}>
        <input
          type="text"
          className={`${styles.controlInput} ${
            disabled ? styles.controlDisabled : ""
          }`}
          placeholder={placeholder}
          value={displayLabel}
          readOnly
          onClick={() => {
            if (!disabled) setOpen((prev) => !prev);
          }}
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

      {/* Dropdown with embedded search */}
      {open && !disabled && (
        <div className={styles.dropdown}>
          <div className={styles.searchWrapper}>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
