"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-canvas">
      <div className="auth-glass-card animate-fade-up">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          appearance={{
            elements: {
              rootBox: {
                boxShadow: "none",
                borderRadius: "var(--radius-xl)",
              },
              card: {
                background: "transparent",
                borderRadius: "var(--radius-xl)",
                border: "none",
                boxShadow: "none",
              },
              headerTitle: {
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              },
              headerSubtitle: {
                color: "var(--text-secondary)",
              },
              formButtonPrimary: {
                background: "var(--accent)",
                "&:hover": { background: "var(--accent-hover)" },
              },
              footerActionLink: {
                color: "var(--accent)",
              },
            },
          }}
        />
      </div>
    </main>
  );
}
