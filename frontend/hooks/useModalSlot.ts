"use client";

import { useEffect, useState } from "react";
import { requestModal, releaseModal, onModalChange } from "@/lib/modalManager";

/**
 * Coordinates blocking modals through lib/modalManager so only ONE
 * full-screen dialog (scrim + focus trap) is ever active at a time.
 *
 * `wanted` is the component's own "I would like to show" state; the returned
 * boolean is whether the slot was actually granted. A denied modal
 * automatically retries when the active modal releases its slot, so
 * simultaneous first-visit dialogs (consent, onboarding tour, preferences,
 * personalization) serialize one-after-another instead of stacking scrims
 * and competing focus traps.
 */
export function useModalSlot(id: string, wanted: boolean): boolean {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!wanted) {
      releaseModal(id);
      setGranted(false);
      return;
    }
    const attempt = () => setGranted(requestModal(id));
    attempt();
    // Retry whenever the active modal changes — this is how a queued modal
    // acquires the slot after the current one closes.
    const unsubscribe = onModalChange(attempt);
    return () => {
      unsubscribe();
      releaseModal(id);
    };
  }, [id, wanted]);

  return granted;
}
