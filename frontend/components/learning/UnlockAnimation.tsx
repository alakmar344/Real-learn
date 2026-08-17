"use client";

import { Icon } from "@/components/shared/icons";

// Quiz-pass celebration, confined to a small centered element instead of the
// old full-viewport accent flash (a WCAG 2.3.1 photosensitivity risk). A soft
// ring sweeps outward from a check disc — rewarding, not blinding. Reduced
// motion neutralizes it via the global animation kill-switch.
export default function UnlockAnimation({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div aria-hidden="true" className="unlock-fx">
      <span className="unlock-fx__ring" />
      <span className="unlock-fx__core">
        <Icon name="check" size={28} />
      </span>
    </div>
  );
}
