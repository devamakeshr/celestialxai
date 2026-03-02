"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";

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

import { Chart } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

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

type Timeframe = "1H" | "4H" | "1D";

type Candle = {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

/* ================= UTIL ================= */

function formatLarge(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

/* ================= COMPONENT ================= */

export default function ALXDashboard() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [alxBalance, setAlxBalance] = useState(0);
  const [alxPriceUSD, setAlxPriceUSD] = useState(0);
  const [liquidityUSD, setLiquidityUSD] = useState(0);
  const [marketCap, setMarketCap] = useState(0);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [isLoading, setIsLoading] = useState(false);

  function SkeletonCard() {
    return (
      <div className="bg-gray-800/40 animate-pulse p-6 rounded-2xl h-24" />
    );
  }
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
    const address = accounts[0];

    setWallet(address);
    await fetchAll(provider, address);
  }

  async function fetchAll(
    provider: ethers.BrowserProvider,
    address: string
  ) {
    try {
      setIsLoading(true);

      const agg = new ethers.Contract(
        CHAINLINK_BNB_USD,
        CHAINLINK_ABI,
        provider
      );
      const [, answer] = await agg.latestRoundData();
      const bnbUsd = Number(answer) / 1e8;

      const token = new ethers.Contract(
        ALX_CONTRACT,
        ERC20_ABI,
        provider
      );
      const balance = await token.balanceOf(address);
      setAlxBalance(Number(ethers.formatUnits(balance, 18)));

      const pair = new ethers.Contract(
        ALX_WBNB_PAIR,
        PAIR_ABI,
        provider
      );

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

      const wbnbReserve =
        token0.toLowerCase() === ALX_CONTRACT
          ? reserve1
          : reserve0;

      setLiquidityUSD(2 * wbnbReserve * bnbUsd);
      setMarketCap(TOTAL_SUPPLY * priceUSD);

      const history = await fetchSeries(provider, bnbUsd, timeframe);
      setCandles(history);

      setIsLoading(false);
    } catch (err: unknown) {
      console.error(err);
      setIsLoading(false);
    }
  }

  async function fetchSeries(
    provider: ethers.BrowserProvider,
    bnbUsd: number,
    tf: Timeframe
  ): Promise<Candle[]> {
    try {
      const key = process.env.NEXT_PUBLIC_BSCSCAN_API_KEY;
      if (!key) return [];

      const now = Math.floor(Date.now() / 1000);

      let secondsBack = 24 * 3600;
      let candleCount = 24;

      if (tf === "1H") {
        secondsBack = 3600;
        candleCount = 12;
      } else if (tf === "4H") {
        secondsBack = 4 * 3600;
        candleCount = 16;
      }

      const startTime = now - secondsBack;

      const blockRes = await axios.get(
        `https://api.bscscan.com/api?module=block&action=getblocknobytime&timestamp=${startTime}&closest=before&apikey=${key}`
      );

      if (blockRes.data.status !== "1") return [];

      const startBlock = Number(blockRes.data.result);
      const currentBlock = await provider.getBlockNumber();

      const step = Math.max(
        1,
        Math.floor((currentBlock - startBlock) / candleCount)
      );

      const pair = new ethers.Contract(
        ALX_WBNB_PAIR,
        PAIR_ABI,
        provider
      );

      const data: Candle[] = [];

      for (let i = 0; i < candleCount; i++) {
        const block = startBlock + step * i;
        const blockData = await provider.getBlock(block);

        const [r0, r1] = await pair.getReserves({ blockTag: block });
        const t0 = await pair.token0({ blockTag: block });

        const reserve0 = Number(ethers.formatUnits(r0, 18));
        const reserve1 = Number(ethers.formatUnits(r1, 18));

        const priceWBNB =
          t0.toLowerCase() === ALX_CONTRACT
            ? reserve1 / reserve0
            : reserve0 / reserve1;

        const priceUSD = priceWBNB * bnbUsd;

        data.push({
          x: (blockData?.timestamp ?? 0) * 1000,
          o: priceUSD,
          h: priceUSD * 1.02,
          l: priceUSD * 0.98,
          c: priceUSD,
        });
      }

      return data;
    } catch (err: unknown) {
      console.error(err);
      return [];
    }
  }

  useEffect(() => {
    if (!wallet || !window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);

    const reload = async () => {
      const agg = new ethers.Contract(
        CHAINLINK_BNB_USD,
        CHAINLINK_ABI,
        provider
      );
      const [, answer] = await agg.latestRoundData();
      const bnbUsd = Number(answer) / 1e8;

      const history = await fetchSeries(provider, bnbUsd, timeframe);
      setCandles(history);
    };

    reload();
  }, [timeframe, wallet]);

  return (
    <main className="min-h-screen bg-[#050816] text-white relative overflow-hidden">

      {/* 🌌 Background Glow */}
      <div className="absolute w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-blue-600/20 blur-[120px] sm:blur-[160px] rounded-full top-[-150px] left-[-150px]" />
      <div className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-purple-600/20 blur-[120px] sm:blur-[160px] rounded-full bottom-[-150px] right-[-150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-10">

          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🪙 ALX Dashboard
          </h1>

          <button
            onClick={connectWallet}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 text-sm sm:text-base"
          >
            {wallet ? "Connected" : "Connect Wallet"}
          </button>

        </div>

        {/* ================= PANCAKESWAP CARD ================= */}
        <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-yellow-500/10 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-yellow-500/20 shadow-lg shadow-yellow-500/10 mb-10">

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-yellow-400">
              🥞 PancakeSwap
            </h2>

            <span className="text-xs px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30 w-fit">
              BNB Smart Chain
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           
                <SwapCard
                  title="Swap ALX"
                  link="https://pancakeswap.finance/swap?outputCurrency=0x09d6b05CED95755C5c8bB9e6D08298E45b5d3227"
                />

                <SwapCard
                  title="Add Liquidity"
                  link="https://pancakeswap.finance/add/WBNB/0x09d6b05CED95755C5c8bB9e6D08298E45b5d3227"
                />

                <SwapCard
                  title="View Pool"
                  link="https://pancakeswap.finance/liquidity/pool/bsc/0x6156d89D3eda15285e64A67863E66d7Cf6fD9Cb4"
                />
             



          </div>
        </div>

        {wallet && (
          <>
            {/* ================= STATS GRID ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
 {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
              <Card title="ALX Balance" value={`${alxBalance.toFixed(2)} ALX`} />
              <Card title="ALX Price" value={`$${alxPriceUSD.toFixed(6)}`} />
              <Card title="Liquidity (TVL)" value={`$${formatLarge(liquidityUSD)}`} />
              <Card title="Market Cap" value={`$${formatLarge(marketCap)}`} />
 </>
            )}
            </div>

            {/* ================= TIMEFRAME SELECTOR ================= */}
            <div className="flex justify-center sm:justify-start gap-2 sm:gap-3 mb-6">
              {["1H", "4H", "1D"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf as Timeframe)}
                  className={`px-4 py-2 text-xs sm:text-sm rounded-lg border transition ${timeframe === tf
                      ? "bg-blue-600 border-blue-500"
                      : "bg-white/5 border-gray-700"
                    }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* ================= CHART ================= */}
            <div className="bg-white/5 backdrop-blur-xl p-4 sm:p-8 rounded-3xl border border-white/10 shadow-xl overflow-x-auto">

              <div className="min-w-[600px]">
                <Chart
                  type="candlestick"
                  data={{
                    datasets: [{ label: "ALX", data: candles }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      x: { type: "time" },
                      y: { type: "linear" },
                    },
                    plugins: {
                      legend: { display: false },
                    },
                  }}
                />
              </div>

            </div>
          </>
        )}

      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-900 p-6 rounded-xl">
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function SwapCard({
  title,
  link,
}: {
  title: string;
  link: string;
}) {
  return (
    <a
      href={link}
      target="_blank"
      className="bg-black/40 p-5 rounded-2xl border border-yellow-500/30 
                 hover:bg-yellow-500/10 transition-all text-center"
    >
      <p className="text-gray-400 text-sm mb-2">{title}</p>
      <p className="text-base font-bold text-yellow-400">
        Open →
      </p>
    </a>
  );
}