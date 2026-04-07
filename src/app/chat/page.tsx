"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;

interface Msg { role: string; content: string; }

const suggestedPrompts = [
  "Qual oleo usar no meu carro?",
  "Diferenca entre sintetico e mineral?",
  "Quando trocar o filtro de ar?",
  "Posso misturar oleos diferentes?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [veiculoLabel, setVeiculoLabel] = useState("");
  const [showPrompts, setShowPrompts] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { init(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserId(user.id);

    // Auto-detect user's first car for context
    const { data: meus } = await supabase
      .from("meus_veiculos")
      .select("veiculo_id, veiculos(id, marca, modelo, ano_de)")
      .eq("user_id", user.id)
      .limit(1);

    if (meus?.length) {
      const v = (meus[0] as A).veiculos;
      setVeiculoId(v.id);
      const label = `${v.marca} ${v.modelo} ${v.ano_de || ""}`.trim();
      setVeiculoLabel(label);
      setMessages([{
        role: "assistant",
        content: `Ola! Vi que voce tem um ${label}. Posso te ajudar com especificacoes, manutencao ou qualquer duvida sobre lubrificantes. O que precisa?`,
      }]);
    } else {
      setMessages([{
        role: "assistant",
        content: "Ola! Sou o assistente Panther. Posso te ajudar com especificacoes de lubrificantes, filtros e manutencao. Qual seu veiculo?",
      }]);
    }
  }

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowPrompts(false);
    setMessages((p) => [...p, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg, veiculo_id: veiculoId, user_id: userId }) });
      const d = await res.json();
      setMessages((p) => [...p, { role: "assistant", content: d.answer || "Nao consegui processar." }]);
    } catch { setMessages((p) => [...p, { role: "assistant", content: "Erro de conexao." }]); }
    setLoading(false);
  }

  return (
    <>
      <div className="flex flex-col h-screen max-w-lg mx-auto lg:max-w-2xl lg:pl-56">
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground lg:hidden">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-[15px] font-semibold">Assistente Panther</h1>
              {veiculoLabel && <p className="text-[11px] text-muted-foreground capitalize">{veiculoLabel}</p>}
              {!veiculoLabel && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-muted-foreground">Online</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === "user" ? "bg-foreground text-background rounded-br-md" : "bg-foreground/5 rounded-bl-md"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Suggested prompts — cards clicaveis */}
          {showPrompts && !loading && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {suggestedPrompts.map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="p-3 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] text-left text-[13px] text-muted-foreground hover:text-foreground transition-colors pressable">
                  {p}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-foreground/5 rounded-2xl rounded-bl-md px-4 py-3.5">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 chat-dot" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 chat-dot" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 chat-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-5 py-3 pb-20 lg:pb-3">
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pergunte sobre lubrificantes..."
              className="flex-1 h-11 rounded-xl bg-foreground/5 px-4 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10" />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="h-11 px-5 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-30 pressable">
              Enviar
            </button>
          </div>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
