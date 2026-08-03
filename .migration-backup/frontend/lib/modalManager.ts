"use client";

/**
 * Modal mutual-exclusion guard.
 *
 * Multiple blocking modals (PreSignInConsent, PersonalizationGate,
 * PreferenceModal, ThemeModal) share the same z-index. Without coordination,
 * two could render simultaneously. This module ensures only one is active at
 * a time.
 */

let activeModal: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Returns true if the modal was granted, false if another is already active. */
export function requestModal(id: string): boolean {
  if (activeModal && activeModal !== id) return false;
  activeModal = id;
  notify();
  return true;
}

export function releaseModal(id: string): void {
  if (activeModal === id) {
    activeModal = null;
    notify();
  }
}

export function isModalActive(): boolean {
  return activeModal !== null;
}

/** Subscribe to modal state changes. Returns an unsubscribe function. */
export function onModalChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
