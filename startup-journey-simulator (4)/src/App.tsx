import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Users, 
  Rocket, 
  MessageSquare, 
  DollarSign, 
  Star, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Send,
  User as UserIcon,
  Briefcase,
  TrendingUp,
  LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Player {
  id: string;
  name: string;
  role: string;
  sessionId?: string;
}

interface LogEntry {
  sender: string;
  role: string;
  text: string;
  timestamp: number;
}

interface Session {
  id: string;
  problem: string;
  founder: string | null;
  customer: string | null;
  investor: string | null;
  pitch: string;
  deal: { valuation: number; equity: number } | null;
  proposedDeal: { valuation: number; equity: number } | null;
  proposerId: string | null;
  reviews: { reviewer: string; rating: number; comment: string }[];
  status: "pitching" | "funding" | "launched" | "evaluating" | "evaluated" | "error";
  logs: LogEntry[];
  report?: any;
  error?: string;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [aiStatus, setAiStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("founder");
  const [problem, setProblem] = useState("");
  const [message, setMessage] = useState("");
  const [pitch, setPitch] = useState("");
  const [deal, setDeal] = useState({ valuation: 1000000, equity: 10 });
  const [review, setReview] = useState({ rating: 5, comment: "" });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("update_players", (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    newSocket.on("update_sessions", (updatedSessions: Session[]) => {
      setSessions(updatedSessions);
    });

    newSocket.on("lobby_joined", (p: Player) => {
      setPlayer(p);
    });

    newSocket.on("session_created", (s: Session) => {
      setCurrentSession(s);
    });

    newSocket.on("session_updated", (s: Session) => {
      setCurrentSession(s);
    });

    newSocket.on("new_message", (log: LogEntry) => {
      setCurrentSession(prev => prev ? { ...prev, logs: [...prev.logs, log] } : null);
    });

    // Check AI status
    fetch("/api/ai-status")
      .then(res => res.json())
      .then(data => setAiStatus(data))
      .catch(() => setAiStatus({ connected: false, message: "Server unreachable" }));

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.logs]);

  const joinLobby = () => {
    if (name && socket) {
      socket.emit("join_lobby", { name, role });
    }
  };

  const createSession = () => {
    if (problem && socket) {
      socket.emit("create_session", { problem });
    }
  };

  const joinSession = (sessionId: string, joinRole: string) => {
    if (socket) {
      socket.emit("join_session", { sessionId, role: joinRole });
    }
  };

  const sendMessage = () => {
    if (message && socket && currentSession) {
      socket.emit("send_message", { sessionId: currentSession.id, message });
      setMessage("");
    }
  };

  const submitPitch = () => {
    if (pitch && socket && currentSession) {
      socket.emit("submit_pitch", { sessionId: currentSession.id, pitch });
    }
  };
  
  const proposeDeal = () => {
    if (socket && currentSession) {
      socket.emit("propose_deal", { sessionId: currentSession.id, deal });
    }
  };

  const acceptDeal = () => {
    if (socket && currentSession) {
      socket.emit("accept_deal", { sessionId: currentSession.id });
    }
  };

  const submitReview = () => {
    if (socket && currentSession) {
      socket.emit("submit_review", { sessionId: currentSession.id, review });
    }
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#151515] border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Rocket className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Startup Journey</h1>
              <p className="text-white/50 text-sm italic">Multiplayer Simulator</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2 font-semibold">Your Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/40 mb-2 font-semibold">Select Role</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "founder", icon: Rocket, label: "Founder" },
                  { id: "customer", icon: UserIcon, label: "Customer" },
                  { id: "investor", icon: DollarSign, label: "Investor" }
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                      role === r.id 
                        ? "bg-orange-500 border-orange-500 text-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <r.icon size={20} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={joinLobby}
              disabled={!name}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              Enter Lobby
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <Rocket className="text-orange-500" size={32} />
              <h1 className="text-2xl font-bold tracking-tight uppercase italic">Lobby</h1>
            </div>
            <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest">{players.length} Online</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", aiStatus?.connected ? "bg-green-500" : "bg-red-500")} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {aiStatus?.connected ? (aiStatus.message.includes("Fallback") ? "AI: Hybrid" : "AI: Ready") : "AI: Offline"}
                </span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">{player.name} ({player.role})</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#151515] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-orange-500" />
                  Active Startup Journeys
                </h2>
                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <div className="text-center py-12 text-white/30 border border-dashed border-white/10 rounded-xl">
                      No active sessions. Start a new journey!
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex justify-between items-center hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-xs text-orange-500 font-bold uppercase tracking-widest mb-1">Problem</p>
                          <p className="font-medium line-clamp-1">{s.problem}</p>
                          <div className="flex gap-4 mt-3">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-white/40">
                              <UserIcon size={12} /> {s.customer ? "Customer Joined" : "Waiting..."}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-white/40">
                              <Rocket size={12} /> {s.founder ? "Founder Joined" : "Waiting..."}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-white/40">
                              <DollarSign size={12} /> {s.investor ? "Investor Joined" : "Waiting..."}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => joinSession(s.id, player.role)}
                          className="bg-white text-black px-6 py-2 rounded-lg font-bold text-xs uppercase hover:bg-orange-500 hover:text-white transition-all"
                        >
                          Join
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {player.role === "customer" && (
                <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/10">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <AlertCircle size={20} />
                    Define a Problem
                  </h2>
                  <p className="text-sm text-white/80 mb-4">As a customer, you set the stage. What real-world problem needs solving?</p>
                  <textarea 
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="e.g., I'm tired of losing my keys in my own house..."
                    className="w-full bg-black/20 border border-white/20 rounded-xl p-4 text-sm focus:outline-none focus:border-white transition-colors mb-4 h-32"
                  />
                  <button 
                    onClick={createSession}
                    disabled={!problem}
                    className="w-full bg-white text-orange-500 font-bold py-3 rounded-xl hover:bg-black hover:text-white transition-all uppercase tracking-widest text-xs"
                  >
                    Start Journey
                  </button>
                </div>
              )}

              <div className="bg-[#151515] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users size={20} className="text-orange-500" />
                  Online Players
                </h2>
                <div className="space-y-3">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/5 px-4 py-2 rounded-lg">
                      <span className="text-sm font-medium">{p.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-white/40">{p.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0a] z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentSession(null)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <h1 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="text-orange-500">Session:</span> {currentSession.id.split('_')[1]}
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              currentSession.status === "pitching" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
              currentSession.status === "funding" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
              currentSession.status === "launched" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
              "bg-purple-500/20 text-purple-400 border border-purple-500/30"
            )}>
              {currentSession.status}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
            <UserIcon size={14} /> {player.name} ({player.role})
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Chat & Negotiation */}
        <div className="flex-1 flex flex-col border-r border-white/10 bg-[#0d0d0d]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">The Problem</p>
              <p className="text-sm italic">"{currentSession.problem}"</p>
            </div>

            <AnimatePresence initial={false}>
              {currentSession.logs.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    log.sender === player.name ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-white/40">{log.sender}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 bg-white/5 rounded text-white/30">{log.role}</span>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-sm",
                    log.role === "system" ? "bg-white/5 text-white/40 italic text-xs w-full text-center border border-white/5" :
                    log.sender === player.name ? "bg-orange-500 text-white rounded-tr-none" : "bg-[#1a1a1a] text-white rounded-tl-none border border-white/10"
                  )}>
                    {log.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
            <div className="flex gap-3">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type your message or pitch..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button 
                onClick={sendMessage}
                className="bg-orange-500 hover:bg-orange-600 p-3 rounded-xl transition-all"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Status Board & Actions */}
        <div className="w-[400px] bg-[#0a0a0a] flex flex-col overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Status Board */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
                <Briefcase size={14} /> Status Board
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#151515] border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Funding</p>
                  <p className="text-lg font-bold text-green-500">
                    {currentSession.deal ? `$${(currentSession.deal.valuation * (currentSession.deal.equity / 100)).toLocaleString()}` : "None"}
                  </p>
                </div>
                <div className="bg-[#151515] border border-white/10 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Equity</p>
                  <p className="text-lg font-bold text-orange-500">
                    {currentSession.deal ? `${currentSession.deal.equity}%` : "0%"}
                  </p>
                </div>
              </div>
            </section>

            {/* Role Actions */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-4 flex items-center gap-2">
                <CheckCircle size={14} /> Your Actions
              </h3>

              {player.role === "founder" && currentSession.status === "pitching" && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-500">Submit Final Pitch</p>
                  <textarea 
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    placeholder="Describe your solution in detail..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm h-32 focus:outline-none focus:border-orange-500"
                  />
                  <button 
                    onClick={submitPitch}
                    className="w-full bg-orange-500 hover:bg-orange-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest"
                  >
                    Lock In Pitch
                  </button>
                </div>
              )}

              {(player.role === "founder" || player.role === "investor") && currentSession.status === "funding" && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-green-500">Negotiate Deal</p>
                  
                  {currentSession.proposedDeal && currentSession.proposerId !== player.id && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-2">Incoming Proposal</p>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-[8px] uppercase text-white/40">Valuation</p>
                          <p className="text-sm font-bold">${currentSession.proposedDeal.valuation.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase text-white/40">Equity</p>
                          <p className="text-sm font-bold">{currentSession.proposedDeal.equity}%</p>
                        </div>
                      </div>
                      <button 
                        onClick={acceptDeal}
                        className="w-full bg-green-500 hover:bg-green-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Accept This Deal
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase text-white/40 mb-1">Valuation ($)</label>
                      <input 
                        type="number" 
                        value={isNaN(deal.valuation) ? "" : deal.valuation}
                        onChange={(e) => setDeal({ ...deal, valuation: parseInt(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-white/40 mb-1">Equity (%)</label>
                      <input 
                        type="number" 
                        value={isNaN(deal.equity) ? "" : deal.equity}
                        onChange={(e) => setDeal({ ...deal, equity: parseInt(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={proposeDeal}
                    className="w-full bg-white text-black hover:bg-orange-500 hover:text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {currentSession.proposedDeal ? "Update Proposal" : "Propose Deal"}
                  </button>
                </div>
              )}

              {player.role === "customer" && currentSession.status === "launched" && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-500">Review Product</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => setReview({ ...review, rating: star })}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          review.rating >= star ? "text-yellow-500 bg-yellow-500/10" : "text-white/20 hover:text-white/40"
                        )}
                      >
                        <Star size={20} fill={review.rating >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={review.comment}
                    onChange={(e) => setReview({ ...review, comment: e.target.value })}
                    placeholder="Final thoughts on the product..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm h-24 focus:outline-none focus:border-purple-500"
                  />
                  <button 
                    onClick={submitReview}
                    className="w-full bg-purple-500 hover:bg-purple-600 py-3 rounded-xl font-bold text-xs uppercase tracking-widest"
                  >
                    Submit Review
                  </button>
                </div>
              )}

              {currentSession.status === "error" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest">Evaluation Failed</p>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {currentSession.error || "An unexpected error occurred during AI evaluation. Please try again or check your API keys."}
                  </p>
                  <button 
                    onClick={() => setCurrentSession(null)}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Back to Lobby
                  </button>
                </div>
              )}

              {currentSession.status === "evaluating" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">AI Judging in Progress...</p>
                </div>
              )}

              {currentSession.status === "evaluated" && currentSession.report && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-orange-500 rounded-2xl p-6 text-white shadow-2xl shadow-orange-500/20"
                >
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <CheckCircle /> Final Report
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[8px] uppercase font-bold text-white/60 mb-1">Founder</p>
                        <p className="text-xl font-black">{currentSession.report.founderScore}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] uppercase font-bold text-white/60 mb-1">Customer</p>
                        <p className="text-xl font-black">{currentSession.report.customerScore}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] uppercase font-bold text-white/60 mb-1">Investor</p>
                        <p className="text-xl font-black">{currentSession.report.investorScore}</p>
                      </div>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2">Verdict</p>
                      <p className="text-2xl font-black uppercase italic tracking-tighter">{currentSession.report.result}</p>
                    </div>

                    <div className="text-sm leading-relaxed text-white/90">
                      {currentSession.report.analysis}
                    </div>

                    <button 
                      onClick={() => setCurrentSession(null)}
                      className="w-full bg-white text-orange-500 font-bold py-3 rounded-xl hover:bg-black hover:text-white transition-all uppercase text-xs tracking-widest"
                    >
                      Back to Lobby
                    </button>
                  </div>
                </motion.div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
