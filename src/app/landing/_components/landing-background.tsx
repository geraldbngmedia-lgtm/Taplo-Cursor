export function LandingBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#f3f5f8]">
      <div className="taplo-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-[#ff7a5c]/25 blur-[7.5rem] will-change-transform" />
      <div className="taplo-bg-blob-two absolute bottom-[-18%] right-[-10%] w-[62vw] h-[62vw] rounded-full bg-[#ff7a5c]/15 blur-[8.75rem] will-change-transform" />
      <div
        className="taplo-bg-dots absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)",
          backgroundSize: "2rem 2rem",
        }}
      />
    </div>
  );
}
