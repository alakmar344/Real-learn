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
      <div className="auth-glass-card auth-glass-card--redirect animate-fade-up">
        <div className="onboarding-spinner auth-redirect__spinner" aria-hidden="true" />
        <p className="auth-redirect__text">
          Redirecting to RealLearn setup…
        </p>
      </div>
    </main>
  );
}
