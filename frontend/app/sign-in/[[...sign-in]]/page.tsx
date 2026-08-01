"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="auth-canvas">
      <div className="auth-glass-card animate-fade-up">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
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
