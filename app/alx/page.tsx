"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale);

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

// CONFIG
const ALX_CONTRACT = "0x09d6b05CED95755C5c8bB9e6D08298E45b5d3227";
const ALX_WBNB_PAIR = "0x6156d89D3eda15285e64A67863E66d7Cf6fD9Cb4";
const ALX_DECIMALS = 18;
const TOTAL_SUPPLY = 100_000_000; // Adjust if needed
const BSC_CHAIN_ID = "0x38";
const BNB_USD = 623.29; // Replace with live oracle later

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32)",
  "function token0() view returns (address)",
];

export default function ALXDashboard() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [alxBalance, setAlxBalance] = useState(0);
  const [bnbBalance, setBnbBalance] = useState(0);
  const [alxPriceWBNB, setAlxPriceWBNB] = useState(0);
  const [alxPriceUSD, setAlxPriceUSD] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [marketCap, setMarketCap] = useState(0);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

async function connectWallet() {
  if (!window.ethereum) return alert("Install MetaMask");

  // 🔥 FIRST switch network
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: BSC_CHAIN_ID }],
  }).catch(async (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    const err = error as { code?: number };

    if (err.code === 4902) {
      await window.ethereum?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BSC_CHAIN_ID,
            chainName: "BNB Smart Chain",
            nativeCurrency: {
              name: "BNB",
              symbol: "BNB",
              decimals: 18,
            },
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            blockExplorerUrls: ["https://bscscan.com"],
          },
        ],
      });
    } else {
      console.error(error);
    }
  }
});
  // 🔥 THEN create provider AFTER switching
  const provider = new ethers.BrowserProvider(window.ethereum);

  const accounts = await provider.send("eth_requestAccounts", []);
  const address = accounts[0];

  setWallet(address);

  // 🔥 DEBUG
  const network = await provider.getNetwork();
  console.log("Connected Chain:", network.chainId);

  await fetchAll(provider, address);
}

  function disconnectWallet() {
    setWallet(null);
    setAlxBalance(0);
    setBnbBalance(0);
  }

  async function fetchAll(provider: ethers.BrowserProvider, address: string) {
    try {
      const token = new ethers.Contract(ALX_CONTRACT, ERC20_ABI, provider);
      const balance = await token.balanceOf(address);
      const formattedALX = Number(
        ethers.formatUnits(balance, ALX_DECIMALS)
      );
      setAlxBalance(formattedALX);

      const bnb = await provider.getBalance(address);
      setBnbBalance(Number(ethers.formatEther(bnb)));

      const pair = new ethers.Contract(ALX_WBNB_PAIR, PAIR_ABI, provider);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      const priceWBNB =
        token0.toLowerCase() === ALX_CONTRACT.toLowerCase()
          ? Number(reserve1) / Number(reserve0)
          : Number(reserve0) / Number(reserve1);

      const priceUSD = priceWBNB * BNB_USD;

      setAlxPriceWBNB(priceWBNB);
      setAlxPriceUSD(priceUSD);

      setPortfolioValue(formattedALX * priceUSD);
      setMarketCap(TOTAL_SUPPLY * priceUSD);

      setPriceHistory((prev) => [...prev.slice(-19), priceUSD]);

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (!wallet || !window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);

    const interval = setInterval(() => {
      fetchAll(provider, wallet);
    }, 10000);

    return () => clearInterval(interval);
  }, [wallet]);

  return (
    <main className="min-h-screen bg-black text-white flex justify-center p-6">
      <div className="max-w-3xl w-full bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-gray-700">

        <h1 className="text-3xl font-bold text-blue-500 mb-4">
          🪙 ALX Coin Dashboard
        </h1>

        <button
          onClick={connectWallet}
          className="px-6 py-3 bg-blue-600 rounded-xl mr-3"
        >
          {wallet ? "Connected" : "Connect Wallet"}
        </button>

        <button
          onClick={disconnectWallet}
          className="px-6 py-3 bg-red-600 rounded-xl"
        >
          Disconnect
        </button>

        {wallet && (
          <div className="space-y-4 mt-6">

            <Card title="ALX Balance" value={`${alxBalance.toFixed(2)} ALX`} />
            <Card title="BNB Balance" value={`${bnbBalance.toFixed(4)} BNB`} />
            <Card title="ALX Price (USD)" value={`$${alxPriceUSD.toFixed(6)}`} />
            <Card title="Portfolio Value" value={`$${portfolioValue.toFixed(2)}`} />
            <Card title="Market Cap" value={`$${marketCap.toLocaleString()}`} />
<Card title="ALX Price (WBNB)" value={`${alxPriceWBNB.toFixed(8)} WBNB`} />
            <div className="bg-black/40 p-4 rounded-xl border border-gray-600">
              <p className="text-gray-400 mb-2">Live Price Chart</p>
              <Line
                data={{
                  labels: priceHistory.map((_, i) => i),
                  datasets: [
                    {
                      data: priceHistory,
                      borderColor: "#3b82f6",
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: { x: { display: false } },
                }}
              />
            </div>

          </div>
        )}
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-black/40 p-4 rounded-xl border border-gray-600">
      <p className="text-gray-400">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}