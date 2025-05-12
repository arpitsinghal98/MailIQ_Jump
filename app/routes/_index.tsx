// app/routes/_index.tsx

export default function IndexPage() {
  return (
    <div className="relative min-h-screen bg-white text-black overflow-hidden flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white to-yellow-200 opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

      <div className="w-full overflow-x-hidden flex justify-center">
        <h1 className="whitespace-nowrap text-[3.5rem] sm:text-[5rem] md:text-[8rem] lg:text-[14rem] font-extrabold text-black/10 z-10">
          MailIQ
        </h1>
      </div>

      <div className="-mt-6 z-20 text-center">
        <p className="text-base sm:text-lg text-black/80 max-w-xl mx-auto mb-6 px-2">
          Your Autonomous Inbox Intelligence. <br />
          Sort, summarize, and clean your inbox — before you even open it.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="/auth/google"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full text-sm sm:text-base transition"
          >
            Get Started
          </a>

        </div>
      </div>
    </div>
  );
}