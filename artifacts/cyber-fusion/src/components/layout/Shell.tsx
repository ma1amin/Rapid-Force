import Sidebar from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle grid pattern overlay for tactical feel */}
        <div className="absolute inset-0 pointer-events-none opacity-5" 
             style={{ backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 h-full p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
