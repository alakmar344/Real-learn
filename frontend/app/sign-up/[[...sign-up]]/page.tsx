import Navbar from "@/components/shared/Navbar";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div className="glass-panel engraved identity-texture texture-noise animate-fade-up" style={{ borderRadius: "var(--radius-2xl)", padding: 16 }}>
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                rootBox: {
                  boxShadow: "none",
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
                  fontWeight: 800,
                },
                headerSubtitle: {
                  color: "var(--text-secondary)",
                },
                formButtonPrimary: {
                  background: "var(--accent)",
                  border: "2px solid var(--accent)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-glow-accent)",
                  "&:hover": { background: "var(--accent-hover)" },
                },
                footerActionLink: {
                  color: "var(--accent)",
                  fontWeight: 600,
                },
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
