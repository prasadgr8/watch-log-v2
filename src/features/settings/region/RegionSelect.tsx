import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

import {
  AVAILABILITY_REGIONS,
  getRegionFlag,
  getRegionName,
  type AvailabilityRegionCode,
} from "./availabilityRegion";

interface RegionSelectProps {
  value: AvailabilityRegionCode;
  onChange: (code: AvailabilityRegionCode) => void;
  variant?: "compact" | "field";
  id?: string;
  className?: string;
}

const OPEN_KEYS = new Set(["Enter", " ", "ArrowDown", "ArrowUp"]);

/*
 * Shared themed dropdown for the streaming availability region. Header and
 * Settings use the same catalogue through the same RegionProvider state, so a
 * choice made in either surface persists identically.
 *
 * The former presentation stretched a transparent native <select> over a
 * decorative chip, so on some platforms the browser rendered its own white
 * option popup with default blue hover styling. The control is now an
 * accessible custom listbox (the WAI-ARIA select-only combobox pattern):
 *
 * - a native <button> trigger exposing aria-haspopup, aria-expanded, and
 *   aria-controls,
 * - a themed role="listbox" popup built from the application's surface,
 *   border, and hover tokens (no native option popup, no browser-default
 *   blue), matching the ManualMatchSearch row presentation,
 * - content-driven popup width: the popup sizes to its widest option and is
 *   never narrower than the trigger (w-max with a min-w-full floor),
 * - ArrowUp/ArrowDown/Home/End move the highlight, Enter/Space commit the
 *   highlighted region, Escape closes without changing anything, and Tab or
 *   an outside click dismiss the popup.
 *
 * Opening and highlighting never persist anything. Only committing calls
 * onChange, which remains the single existing region-selection action. Both
 * variants ("compact" header chip and "field" settings/first-run control)
 * share this one implementation.
 */
export default function RegionSelect({
  value,
  onChange,
  variant = "field",
  id,
  className = "",
}: RegionSelectProps) {
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-region-listbox`;
  const optionId = (code: string) => `${listboxId}-option-${code}`;
  const regionName = getRegionName(value);
  const regionFlag = getRegionFlag(value);
  const accessibleName = `Streaming availability region: ${regionName}`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedCode, setHighlightedCode] =
    useState<AvailabilityRegionCode>(value);

  /*
   * Dialog initial focus: the first-run dialog moves initial focus to its
   * region control. With the custom listbox the trigger takes that role, so
   * focus it after the surrounding dialog's mount effect has captured the
   * previously focused element (keeping the dialog's focus restoration
   * correct).
   */
  useEffect(() => {
    const root = rootRef.current;

    if (root === null || root.closest('[role="dialog"]') === null) {
      return undefined;
    }

    const focusTask = window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTask);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    listboxRef.current?.focus();

    function handleDocumentMouseDown(event: MouseEvent): void {
      if (
        rootRef.current !== null &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [isOpen]);

  function openDropdown(): void {
    setHighlightedCode(value);
    setIsOpen(true);
  }

  function closeDropdown(refocusTrigger: boolean): void {
    setIsOpen(false);

    if (refocusTrigger) {
      triggerRef.current?.focus();
    }
  }

  function commitRegion(code: AvailabilityRegionCode): void {
    onChange(code);
    closeDropdown(true);
  }

  function handleTriggerKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void {
    if (isOpen) {
      return;
    }

    if (OPEN_KEYS.has(event.key)) {
      // Prevent the native button activation so Enter/Space opens the popup
      // exactly once instead of also firing a click.
      event.preventDefault();
      openDropdown();
    }
  }

  function handleListboxKeyDown(
    event: ReactKeyboardEvent<HTMLUListElement>,
  ): void {
    const currentIndex = Math.max(
      AVAILABILITY_REGIONS.findIndex(
        (region) => region.code === highlightedCode,
      ),
      0,
    );

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();

        const next = AVAILABILITY_REGIONS[currentIndex + 1];

        if (next !== undefined) {
          setHighlightedCode(next.code as AvailabilityRegionCode);
        }
        break;
      }

      case "ArrowUp": {
        event.preventDefault();

        const previous = AVAILABILITY_REGIONS[currentIndex - 1];

        if (previous !== undefined) {
          setHighlightedCode(previous.code as AvailabilityRegionCode);
        }
        break;
      }

      case "Home": {
        event.preventDefault();

        const first = AVAILABILITY_REGIONS[0];

        if (first !== undefined) {
          setHighlightedCode(first.code as AvailabilityRegionCode);
        }
        break;
      }

      case "End": {
        event.preventDefault();

        const last = AVAILABILITY_REGIONS[AVAILABILITY_REGIONS.length - 1];

        if (last !== undefined) {
          setHighlightedCode(last.code as AvailabilityRegionCode);
        }
        break;
      }

      case "Enter":
      case " ":
        event.preventDefault();
        commitRegion(highlightedCode);
        break;

      case "Escape":
        // Close without changing anything. Propagation is stopped so the
        // first-run dialog's own Escape handling does not also dismiss the
        // dialog while only the popup should close.
        event.preventDefault();
        event.stopPropagation();
        closeDropdown(true);
        break;

      case "Tab":
        // Let focus move naturally; the popup simply closes without
        // committing anything.
        closeDropdown(false);
        break;

      default:
        break;
    }
  }

  const optionNodes = AVAILABILITY_REGIONS.map((region) => {
    const isHighlighted = region.code === highlightedCode;
    const isSelected = region.code === value;

    return (
      <li
        key={region.code}
        id={optionId(region.code)}
        role="option"
        aria-selected={isSelected}
        onMouseMove={() =>
          setHighlightedCode(region.code as AvailabilityRegionCode)
        }
        onClick={() => commitRegion(region.code as AvailabilityRegionCode)}
        className={`flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm transition ${
          isHighlighted ? "bg-surface text-primary" : "text-primary"
        }`}
      >
        <span aria-hidden="true">{region.flag}</span>
        <span className="min-w-0 truncate">{region.name}</span>

        {isSelected && (
          <Check
            aria-hidden="true"
            className="ml-auto h-4 w-4 shrink-0 text-accent-text"
          />
        )}
      </li>
    );
  });

  if (variant === "compact") {
    return (
      <div ref={rootRef} className={`relative inline-flex ${className}`}>
        <button
          type="button"
          ref={triggerRef}
          onClick={() => (isOpen ? closeDropdown(true) : openDropdown())}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-label={accessibleName}
          title={accessibleName}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-primary transition hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-hover/40"
        >
          <Globe aria-hidden="true" className="h-4 w-4" />

          <span aria-hidden="true" className="hidden sm:inline">
            {regionFlag} {regionName}
          </span>

          <span aria-hidden="true" className="sm:hidden">
            {regionFlag}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 text-muted transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            ref={listboxRef}
            tabIndex={-1}
            aria-label="Streaming availability region"
            aria-activedescendant={optionId(highlightedCode)}
            onKeyDown={handleListboxKeyDown}
            className="absolute right-0 z-50 mt-2 w-max min-w-full list-none overflow-hidden rounded-lg border border-border bg-surface-elevated py-1 shadow-xl outline-none"
          >
            {optionNodes}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        onClick={() => (isOpen ? closeDropdown(true) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={id === undefined ? accessibleName : undefined}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-input-bg px-3 py-2 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
      >
        <span className="min-w-0 truncate">
          {regionFlag} {regionName}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`ml-auto h-4 w-4 shrink-0 text-muted transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          ref={listboxRef}
          tabIndex={-1}
          aria-label="Streaming availability region"
          aria-activedescendant={optionId(highlightedCode)}
          onKeyDown={handleListboxKeyDown}
          className="absolute left-0 z-50 mt-2 w-max min-w-full list-none overflow-hidden rounded-lg border border-border bg-surface-elevated py-1 shadow-xl outline-none"
        >
          {optionNodes}
        </ul>
      )}
    </div>
  );
}
