"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Particles from "react-tsparticles";
import { ethers } from "ethers";
import type { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export default function Page() {
  const launchDate = new Date("2026-06-01T00:00:00").getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);

  // ⏳ Countdown
  useEffect(() => {
    function calculateTimeLeft() {
      const now = new Date().getTime();
      const difference = launchDate - now;

      return {
        days: Math.max(Math.floor(difference / (1000 * 60 * 60 * 24)), 0),
        hours: Math.max(
          Math.floor((difference / (1000 * 60 * 60)) % 24),
          0
        ),
        minutes: Math.max(
          Math.floor((difference / (1000 * 60)) % 60),
          0
        ),
        seconds: Math.max(
          Math.floor((difference / 1000) % 60),
          0
        ),
      };
    }

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [launchDate]);

  // 🔐 Wallet Connect
  async function connectWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setWallet(accounts[0]);
  }

  // 📩 Waitlist
  async function handleWaitlist() {
    if (!email) return alert("Enter email");

    await fetch("/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    setEmail("");
    alert("You're on the waitlist 🚀");
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">

      {/* 🌌 Animated Stars */}
   <Particles
  className="absolute inset-0"
  options={{
    background: { color: "#000000" },
    particles: {
      number: { value: 100 },
      size: { value: 2 },
      move: { enable: true, speed: 0.3 },
      opacity: { value: 0.5 },
    },
  }}
/>

      {/* ✨ Glow Pulse */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600 opacity-20 blur-[150px] rounded-full animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 text-center max-w-3xl w-full"
      >
        <h1 className="text-4xl sm:text-6xl font-bold tracking-widest">
          CELESTIAL<span className="text-blue-500">X</span>AI
        </h1>

        <p className="mt-4 text-gray-400">
          Web3 AI Ecosystem Powered by{" "}
          <span className="text-blue-500 font-semibold">ALX Coin</span>
        </p>

        {/* ⏳ Countdown */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(timeLeft).map(([label, value]) => (
            <div
              key={label}
              className="bg-white/5 border border-gray-700 rounded-xl py-4"
            >
              <div className="text-3xl font-bold text-blue-500">
                {value}
              </div>
              <div className="text-sm text-gray-400 capitalize">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* 📩 Email Waitlist */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <input
            type="email"
            placeholder="Enter your email"
            className="px-4 py-3 rounded-xl bg-white/10 border border-gray-600 w-full sm:w-auto"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            onClick={handleWaitlist}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition"
          >
            Join Waitlist
          </button>
        </div>

        {/* 🔐 Wallet Connect */}
        <div className="mt-6">
          <button
            onClick={connectWallet}
            className="px-6 py-3 border border-blue-500 rounded-xl hover:bg-blue-500 transition"
          >
            {wallet
              ? `Connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`
              : "Connect MetaMask"}
          </button>
        </div>

        <p className="mt-12 text-gray-600 text-sm">
          © {new Date().getFullYear()} Alienx Tech
        </p>
      </motion.div>
    </main>
  );
}