export function Footer() {
  return (
    <footer className="relative border-t border-white/5 mt-10">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-400 to-fuchsia-500 grid place-items-center font-bold text-white text-[11px]">
            M
          </div>
          <span>© {new Date().getFullYear()} Mykos. Built in stealth.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="mailto:kumar@mykos.ai" className="hover:text-white/70 transition">
            kumar@mykos.ai
          </a>
          <a href="https://app.mykos.ai" className="hover:text-white/70 transition">
            App
          </a>
        </div>
      </div>
    </footer>
  );
}
