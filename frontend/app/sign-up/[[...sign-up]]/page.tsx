"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
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
              fontFamily: "var(--font-playfair)",
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
