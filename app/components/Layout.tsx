import { Link } from "@remix-run/react";

type LayoutProps = {
  children: React.ReactNode;
  user?: { id: number; name: string; email: string } | null;
};

export default function Layout({ children, user }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-white text-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-yellow-100 opacity-50 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(#0000000d_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="relative z-10 p-4 flex justify-between items-center bg-white/60 backdrop-blur-md border-b border-black/10 shadow-sm">
        <span className="text-2xl font-bold text-black tracking-tight">
          MailIQ
        </span>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              <span className="font-semibold text-black">Welcome,</span> {user.name}
            </div>
            <Link
              to="/logout"
              className="px-3 py-1.5 text-sm rounded-md bg-black/80 text-white hover:bg-black transition"
            >
              Logout
            </Link>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-hidden h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
}
