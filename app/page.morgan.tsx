import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex flex-col overflow-x-hidden bg-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0 tech-grid pointer-events-none fixed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glow-mesh fixed" />

      {/* Minimalist Header */}
      <header className="w-full p-8 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-2 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
          <span className="text-xl font-bold tracking-widest text-white uppercase">GoDeskless</span>
        </div>
        <div className="flex gap-4 text-sm font-light text-cyan-400/80 uppercase tracking-widest hidden md:flex">
          <span>Neural Interface V18.0</span>
          <span className="animate-pulse">●</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-center relative z-10 px-4 md:px-12 w-full pb-20">
        <InteractiveAvatar />
      </div>

      {/* Section 2: Features Grid */}
      <section className="relative z-10 w-full bg-slate-950/50 border-t border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-20">

          {/* Section Header */}
          <div className="text-center mb-16 space-y-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase">
              Capabilities
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Intelligent Field Service Discovery
            </h2>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Morgan doesn't just chat. She executes a structured discovery framework to understand your needs and tailor the perfect solution.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

            {/* Card 1: Qualification */}
            <div className="group p-6 rounded-2xl bg-slate-950/40 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all duration-300">
              <div className="mb-4 text-emerald-400">
                {/* People/Org Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                Smart Qualification
              </h3>
              <p className="text-sm md:text-[15px] text-slate-300 leading-relaxed">
                Identifies key stakeholders and organizational structure to ensure alignment with your business goals.
              </p>
            </div>

            {/* Card 2: Pain Points */}
            <div className="group p-6 rounded-2xl bg-slate-950/40 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all duration-300">
              <div className="mb-4 text-emerald-400">
                {/* Pulse/Alert Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                Pain Point Detection
              </h3>
              <p className="text-sm md:text-[15px] text-slate-300 leading-relaxed">
                Surfaces operational inefficiencies and service gaps in real-time using advanced sentiment analysis.
              </p>
            </div>

            {/* Card 3: Guidance */}
            <div className="group p-6 rounded-2xl bg-slate-950/40 border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-900/60 transition-all duration-300">
              <div className="mb-4 text-emerald-400">
                {/* Route/Compass Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                Tailored Demo Routing
              </h3>
              <p className="text-sm md:text-[15px] text-slate-300 leading-relaxed">
                Dynamically adjusts the demo path based on discovery data to showcase the most relevant features.
              </p>
            </div>

          </div>

          {/* Bottom Microcopy */}
          <div className="mt-12 text-center">
            <p className="text-xs md:text-sm text-slate-500">
              Powered by Tavus Visual AI & Gemini 1.5 Pro
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Demo Shell Layout */}
      <section id="demo-shell" className="relative z-10 w-full bg-gradient-to-b from-slate-950/50 to-slate-900/50 border-t border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left Column: 3-Step Process */}
            <div className="space-y-8">
              <div className="mb-8">
                <p className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase mb-2">
                  How It Works
                </p>
                <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                  From Conversation to <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Tailored Demonstration
                  </span>
                </h2>
                <p className="text-sm md:text-base text-slate-300 max-w-xl">
                  Start a natural voice conversation with Morgan. She listens, asks strategic questions, and understands your specific field service challenges.
                </p>
              </div>

              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center justify-center mt-1">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Connect & Discover</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Start a natural voice conversation. Morgan listens and adapts to your responses in real-time.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center justify-center mt-1">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Intelligent Analysis</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Morgan maps your pain points to GoDeskless capabilities, constructing a personalized demo flow.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center justify-center mt-1">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Guided Experience</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Morgan shrinks to a companion guide, walking you through the actual GoDeskless platform.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Demo Shell Mockup */}
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute inset-[-20px] bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-[2rem] blur-2xl" />

              {/* Browser Window Card */}
              <div className="relative rounded-3xl bg-slate-950/40 border border-slate-700/60 p-4 md:p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">

                {/* Browser Bar */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  </div>
                  <div className="flex-grow text-center text-xs text-slate-400 font-mono tracking-wide">
                    GoDeskless Demo View
                  </div>
                </div>

                {/* Main Demo Area (Placeholder UI) */}
                <div className="relative mt-1 rounded-2xl bg-slate-900/80 border border-slate-700/50 min-h-[220px] md:min-h-[260px] overflow-hidden flex flex-col">
                  {/* Mock UI Header */}
                  <div className="h-12 border-b border-slate-700/50 bg-slate-800/30 flex items-center px-4 gap-4">
                    <div className="w-6 h-6 rounded bg-slate-700/50" />
                    <div className="h-2 w-24 rounded bg-slate-700/50" />
                  </div>
                  {/* Mock UI Body */}
                  <div className="flex-grow p-4 flex gap-4">
                    <div className="w-16 h-full rounded bg-slate-800/30" />
                    <div className="flex-grow space-y-3">
                      <div className="h-32 rounded bg-slate-800/30" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 rounded bg-slate-800/30" />
                        <div className="h-20 rounded bg-slate-800/30" />
                      </div>
                    </div>
                  </div>

                  {/* Mini-Morgan Bubble */}
                  <div className="absolute bottom-4 right-4 flex flex-col items-center gap-2 z-20">
                    {/* Outer Glow */}
                    <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />

                    {/* Avatar Container */}
                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full border border-slate-400/70 overflow-hidden bg-black shadow-lg">
                      <img
                        src="/morgan-icon.png"
                        alt="Morgan Mini"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Tech Footer */}
      <footer className="w-full p-6 flex justify-between items-end text-xs text-white/20 uppercase tracking-widest z-10">
        <div>
          <p>Secure Connection Established</p>
        </div>
        <div className="text-right">
          <p>© {new Date().getFullYear()} AI Fusion Labs</p>
          <p>Powered by Tavus & Gemini</p>
        </div>
      </footer>
    </main>
  );
}
