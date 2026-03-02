"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from "chart.js";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
import Image from "next/image";
import { Chart } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { useWalletStore } from "@/store/useWalletStore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

/* ================= CONFIG ================= */

const ALX_CONTRACT = "0x09d6b05ced95755c5c8bb9e6d08298e45b5d3227";
const ALX_WBNB_PAIR = "0x6156d89d3eda15285e64a67863e66d7cf6fd9cb4";
const TOTAL_SUPPLY = 100_000_000;
const BSC_CHAIN_ID = "0x38";
const CHAINLINK_BNB_USD = "0x0567f2323251f0aab15c8dfb1967e4e8a7d42aee";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
  "function token0() view returns (address)",
];

const CHAINLINK_ABI = [
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
];

type Candle = {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

function formatLarge(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

export default function ALXDashboard() {
  const [alxBalance, setAlxBalance] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [alxPriceUSD, setAlxPriceUSD] = useState(0);
  const [liquidityUSD, setLiquidityUSD] = useState(0);
  const [marketCap, setMarketCap] = useState(0);
  const [candles, setCandles] = useState<Candle[]>([]);
  const { address, isConnected, setWallet, disconnect } = useWalletStore();

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }],
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const userAddress = accounts[0];

    const network = await provider.getNetwork();

    setWallet(userAddress, network.chainId.toString());

    // 🔥 Fetch balance immediately
    await fetchAlxBalance(provider, userAddress);
  }
  async function fetchPublicData(provider: ethers.BrowserProvider) {
    try {
      const agg = new ethers.Contract(
        CHAINLINK_BNB_USD,
        CHAINLINK_ABI,
        provider
      );
      const [, answer] = await agg.latestRoundData();
      const bnbUsd = Number(answer) / 1e8;

      const pair = new ethers.Contract(ALX_WBNB_PAIR, PAIR_ABI, provider);
      const [r0, r1] = await pair.getReserves();
      const token0 = await pair.token0();

      const reserve0 = Number(ethers.formatUnits(r0, 18));
      const reserve1 = Number(ethers.formatUnits(r1, 18));

      const priceWBNB =
        token0.toLowerCase() === ALX_CONTRACT
          ? reserve1 / reserve0
          : reserve0 / reserve1;

      const priceUSD = priceWBNB * bnbUsd;

      setAlxPriceUSD(priceUSD);
      setLiquidityUSD(2 * reserve1 * bnbUsd);
      setMarketCap(TOTAL_SUPPLY * priceUSD);

      const currentBlock = await provider.getBlockNumber();
      const data: Candle[] = [];

      for (let i = 20; i >= 0; i--) {
        const block = currentBlock - i * 200;
        const blockData = await provider.getBlock(block);
        data.push({
          x: (blockData?.timestamp ?? 0) * 1000,
          o: priceUSD,
          h: priceUSD * 1.02,
          l: priceUSD * 0.98,
          c: priceUSD,
        });
      }

      setCandles(data);
    } catch (err) {
      console.error(err);
    }
  }
  async function fetchAlxBalance(provider: ethers.BrowserProvider, userAddress: string) {
    try {
      const token = new ethers.Contract(ALX_CONTRACT, ERC20_ABI, provider);
      const balance = await token.balanceOf(userAddress);

      const formatted = Number(ethers.formatUnits(balance, 18));

      setAlxBalance(formatted);
      setPortfolioValue(formatted * alxPriceUSD);
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }
  useEffect(() => {
    if (isConnected && address) {
      setPortfolioValue(alxBalance * alxPriceUSD);
    }
  }, [alxPriceUSD, isConnected, address]);
useEffect(() => {
  const checkConnection = async () => {
    if (typeof window === "undefined") return;

    const eth = window.ethereum;
    if (!eth) return;

    const provider = new ethers.BrowserProvider(eth);
    const accounts = await provider.listAccounts();

    if (accounts.length > 0) {
      const network = await provider.getNetwork();
      setWallet(accounts[0].address, network.chainId.toString());

      await fetchAlxBalance(provider, accounts[0].address);
    }
  };

  checkConnection();
}, []);
  useEffect(() => {
    if (!window.ethereum) return;
    const eth = window.ethereum;
    if (!eth) return;

    const provider = new ethers.BrowserProvider(eth);
    fetchPublicData(provider);

    const interval = setInterval(() => {
      fetchPublicData(provider);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#050816] text-white relative overflow-hidden">

      {/* Glow Background */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600/20 blur-[160px] rounded-full top-[-150px] left-[-150px]" />
      <div className="absolute w-[500px] h-[500px] bg-purple-600/20 blur-[160px] rounded-full bottom-[-150px] right-[-150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-12">

          {/* 🔵 LEFT SIDE */}
          <div className="flex items-center gap-4">

            {/* 🔥 Your Logo */}
            <Image
              src="/images/logo.png"
              alt="ALX Logo"
              width={50}
              height={50}
              className="rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              priority
            />

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold 
                     bg-gradient-to-r from-blue-400 to-purple-500 
                     bg-clip-text text-transparent">
                ALX Dashboard
              </h1>

              <p className="text-red-400 mt-1 font-semibold text-sm">
                ${alxPriceUSD.toFixed(6)} / ALX
              </p>
            </div>
          </div>

          {/* 🟣 RIGHT SIDE */}
          <div className="flex items-center gap-4">

            {/* 💼 Wallet Info */}
            {isConnected && address && (
              <div className="bg-white/5 backdrop-blur-xl 
                      px-4 py-2 rounded-xl 
                      border border-white/10 
                      text-sm text-gray-300">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}

            {/* 🔘 Connect Button */}
            <button
              onClick={isConnected ? disconnect : connectWallet}
              className={`px-6 py-3 rounded-xl transition shadow-lg ${isConnected
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isConnected ? "Disconnect" : "Connect Wallet"}
            </button>
          </div>

        </div>

        {/* PANCAKESWAP SECTION */}


        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 mb-12">
          <Card title="ALX Price" value={`$${alxPriceUSD.toFixed(6)}`} />
          <Card title="Liquidity (TVL)" value={`$${formatLarge(liquidityUSD)}`} />
          <Card title="Market Cap" value={`$${formatLarge(marketCap)}`} />

          {isConnected && address && (
            <>
              <Card title="ALX Balance" value={`${alxBalance.toFixed(2)} ALX`} />
              <Card title="Portfolio Value" value={`$${portfolioValue.toFixed(2)}`} />
            </>
          )}
        </div>
        <div className="group relative bg-gradient-to-br 
                from-yellow-500/10 via-orange-500/10 to-yellow-500/10 
                backdrop-blur-xl p-10 rounded-3xl 
                border border-yellow-500/20 
                shadow-[0_0_40px_rgba(234,179,8,0.15)] 
                mb-14 transition-all duration-500">

          {/* 🔥 Subtle Glow on Hover */}
          <div className="absolute inset-0 rounded-3xl 
                  bg-yellow-400/5 opacity-0 
                  group-hover:opacity-100 
                  transition duration-500" />

          {/* 🥞 Header */}
          <div className="relative z-10 flex flex-col items-center mb-10">

            <div className="relative flex items-center justify-center mb-5">
              {/* Neon Glow Circle */}
              <div className="absolute w-24 h-24 rounded-full 
                      bg-yellow-400/20 blur-2xl 
                      opacity-0 group-hover:opacity-100 
                      transition duration-500" />

              <Image
                src="/images/fullpancake.png"
                alt="PancakeSwap"
                width={300}
                height={300}
                className="relative z-10 transition-all duration-500 
                   group-hover:scale-110"
                priority
              />
            </div>



            <p className="text-gray-400 text-sm mt-2 text-center max-w-md">
              Swap, provide liquidity, and view the ALX/WBNB pool directly on PancakeSwap.
            </p>
          </div>

          {/* 🔥 Swap Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <SwapCard
              title="Swap ALX"
              description="Trade ALX instantly on PancakeSwap"
              link="https://pancakeswap.finance/swap?outputCurrency=0x09d6b05CED95755C5c8bB9e6D08298E45b5d3227"
            />

            <SwapCard
              title="Add Liquidity"
              description="Provide liquidity & earn trading fees"
              link="https://pancakeswap.finance/add/WBNB/0x09d6b05CED95755C5c8bB9e6D08298E45b5d3227"
            />

            <SwapCard
              title="View Pool"
              description="Check ALX/WBNB pool stats"
              link="https://pancakeswap.finance/liquidity/pool/bsc/0x6156d89D3eda15285e64A67863E66d7Cf6fD9Cb4"
            />
          </div>
        </div>
      </div>
      {/* CHART */}
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
        <Chart
          type="candlestick"
          data={{
            datasets: [{ label: "ALX", data: candles }],
          }}
          options={{
            responsive: true,
            scales: {
              x: { type: "time" },
              y: { type: "linear" },
            },
            plugins: { legend: { display: false } },
          }}
        />
      </div>

    </main>
  );
}

/* ================= COMPONENTS ================= */

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-900/70 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function SwapCard({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative rounded-3xl p-[1px] overflow-hidden
                 transition-all duration-500 hover:scale-[1.03]"
    >
      {/* 🔥 Neon Animated Border */}
      <div className="absolute inset-0 rounded-3xl
                      bg-[conic-gradient(from_0deg,transparent,rgba(234,179,8,0.6),transparent)]
                      animate-spin-slow opacity-40 group-hover:opacity-70" />

      {/* 🌌 Glass Container */}
      <div className="relative rounded-3xl
                      bg-black/60 backdrop-blur-2xl
                      border border-yellow-500/20
                      p-8 h-full
                      transition-all duration-500
                      group-hover:border-yellow-400/40
                      group-hover:shadow-[0_0_60px_rgba(234,179,8,0.4)]">

        {/* ✨ Shimmer Sweep */}
        <div className="absolute inset-0 -translate-x-full
                        bg-gradient-to-r
                        from-transparent via-yellow-400/20 to-transparent
                        group-hover:translate-x-full
                        transition-transform duration-1000 ease-in-out" />

        <div className="relative z-10 flex flex-col items-center text-center">

          {/* 🥞 PancakeSwap Logo */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full blur-xl 
                  bg-yellow-400/30 opacity-0 
                  group-hover:opacity-100 
                  transition duration-500" />

            <Image
              src="/images/pancake.png"
              alt="PancakeSwap"
              width={60}
              height={60}
              className="relative z-10 transition-all duration-500 group-hover:scale-110"
              priority
            />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-yellow-400 mb-3 tracking-wide">
            {title}
          </h3>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-6 max-w-[220px]">
            {description}
          </p>

          {/* Action Button */}
          <div className="px-5 py-2 rounded-xl
                          bg-yellow-500/10
                          border border-yellow-500/30
                          text-yellow-300
                          transition-all duration-300
                          group-hover:bg-yellow-500/20
                          group-hover:shadow-[0_0_25px_rgba(234,179,8,0.6)]">
            Open →
          </div>

        </div>
      </div>
    </a>
  );
}