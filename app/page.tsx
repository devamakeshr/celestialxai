import { Chat } from "@/components/chat";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ modelId: string }>;
}) {
  const { modelId } = await searchParams;
  // return <Chat modelId={modelId} />;
  return (

    <main className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600 opacity-20 blur-[120px] rounded-full top-[-200px] right-[-200px]" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600 opacity-20 blur-[120px] rounded-full bottom-[-200px] left-[-200px]" />

      <div className="z-10 text-center px-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-widest">
          CELESTIAL<span className="text-blue-500">X</span>AI
        </h1>

        <p className="mt-6 text-gray-400 text-lg md:text-xl">
          Web3 AI Ecosystem Powered by <span className="text-blue-500 font-semibold">ALX Coin</span>
        </p>

        <div className="mt-10">
          <h2 className="text-2xl md:text-3xl font-semibold">
            🚀 Coming Soon
          </h2>

          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            Decentralized AI + ALX Wallet Login + DAO Governance + Space-Tech Infrastructure.
          </p>
        </div>

       

        <p className="mt-16 text-gray-600 text-sm">
          © {new Date().getFullYear()} CelestialX SpaceTech
        </p>
      </div>
    </main>
 
  );
}

