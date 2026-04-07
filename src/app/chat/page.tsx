"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";

interface Message { role: string; content: string; source?: string; }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ola! Sou o assistente Panther Connect. Posso te ajudar com especificacoes de lubrificantes, filtros e manutencao. Como posso ajudar?", source: "template" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [veiculos, setVeiculos] = useState<{ id: number; label: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { init(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserId(user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabase.from("veiculos").select("id, marca, modelo, ano_de").order("marca").limit(50);
    if (data) setVeiculos(data.map((v: any) => ({ id: v.id, label: `${v.marca} ${v.modelo} ${v.ano_de || ""}` })));
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, veiculo_id: veiculoId, user_id: userId }),
      });
      const data = await res.json();
      setMessages((p) => [...p, { role: "assistant", content: data.answer || "Nao consegui processar.", source: data.source }]);
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Erro de conexao.", source: "error" }]);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="flex flex-col h-screen max-w-3xl mx-auto lg:pl-64">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground lg:hidden">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-sm font-bold">Assistente Panther</h1>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          <select
            value={veiculoId || ""}
            onChange={(e) => setVeiculoId(e.target.value ? Number(e.target.value) : null)}
            className="text-xs bg-secondary border border-border rounded-md px-2 py-1.5 max-w-[180px] text-foreground"
            aria-label="Selecionar veiculo para contexto"
          >
            <option value="">Sem contexto de veiculo</option>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 lg:px-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border/50 rounded-bl-sm"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.source && msg.source !== "template" && msg.role === "assistant" && (
                  <p className="text-[9px] mt-1.5 opacity-40">{msg.source === "banco" ? "Dados do banco" : msg.source === "ai" ? "IA" : ""}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-border/50 pb-20 lg:pb-3 lg:px-8">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pergunte sobre lubrificantes..."
              aria-label="Mensagem"
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="default">Enviar</Button>
          </div>
          {veiculoId && (
            <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
              Contexto: {veiculos.find((v) => v.id === veiculoId)?.label}
            </p>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
