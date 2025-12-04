import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black">
      <InteractiveAvatar />

      {/* AI Disclaimer Footer */}
      <footer className="mt-8 text-center max-w-2xl px-4">
        <p className="text-xs text-slate-600">
          Morgan (v18.6) uses AI to generate responses. Information may be inaccurate or incomplete. Please review and verify before acting on any recommendations.
        </p>
      </footer>
    </main>
  );
}
