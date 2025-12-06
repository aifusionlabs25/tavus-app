import InteractiveAvatar from "@/components/InteractiveAvatar";
import AccessGate from "@/components/AccessGate";

export default function Home() {
  return (
    <AccessGate>
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-black">
        <InteractiveAvatar />

        {/* AI Disclaimer Footer */}
        <footer className="absolute bottom-4 text-center max-w-2xl px-4">
          <p className="text-xs text-slate-600">
            Morgan (v18.9) uses AI to generate responses. Information may be inaccurate or incomplete. Please review and verify before acting on any recommendations.
          </p>
        </footer>
      </main>
    </AccessGate>
  );
}
