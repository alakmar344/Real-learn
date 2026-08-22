"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <main className="auth-canvas" aria-busy="true">
      <div className="auth-glass-card animate-fade-up" style={{ textAlign: "center", padding: "var(--space-xl)" }}>
        <div className="onboarding-spinner" aria-hidden="true" style={{ margin: "0 auto var(--space-md)" }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
          Redirecting to RealLearn setup…
        </p>
      </div>
    </main>
  );
}
