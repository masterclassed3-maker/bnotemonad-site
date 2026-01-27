export function GlowBG() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft gradients (Monad vibe) */}
      <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl opacity-40"
           style={{
             background:
               "radial-gradient(circle at 30% 30%, rgba(0,255,209,0.55), transparent 55%), radial-gradient(circle at 70% 40%, rgba(178,0,255,0.55), transparent 55%)",
           }}
      />
      <div className="absolute top-[35%] left-[10%] h-[360px] w-[360px] rounded-full blur-3xl opacity-25"
           style={{
             background:
               "radial-gradient(circle at 40% 40%, rgba(0,180,255,0.5), transparent 60%)",
           }}
      />
      <div className="absolute bottom-[-120px] right-[5%] h-[420px] w-[420px] rounded-full blur-3xl opacity-25"
           style={{
             background:
               "radial-gradient(circle at 60% 40%, rgba(255,0,200,0.45), transparent 60%)",
           }}
      />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.08]"
           style={{
             backgroundImage:
               "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
             backgroundSize: "56px 56px",
           }}
      />
    </div>
  );
}
