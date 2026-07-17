"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            rootBox: {
              boxShadow: "var(--shadow-lg)",
              borderRadius: "var(--radius-xl)",
            },
            card: {
              background: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border-default)",
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
    </main>
  );
}
