export default function AppFooter() {
  return (
    <footer className="app-footer-shell relative z-10 mt-0">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-[clamp(2px,0.45vh,5px)] text-[clamp(9.5px,0.64vw,10.5px)] leading-[1.15] sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 whitespace-nowrap">
          <span>S2S Platform · Real-time Speech-to-Sign Translation</span>
          <span className="text-violet-200/90">
            Secure by design · Production-ready UX · Accessibility-first
          </span>
        </div>
      </div>
    </footer>
  );
}
