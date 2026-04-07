"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Message { role: string; content: string; source?: string; }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ola! Sou o assistente do Panther Connect. Posso te ajudar com especificacoes de lubrificantes, filtros e manutencao do seu veiculo. Como posso ajudar?", source: "template" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [veiculos, setVeiculos] = useState<{id: number; label: string}[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserId(user.id);

    // Load user's vehicles from garagem
    const { data: meus } = await supabase
      .from("meus_veiculos")
      .select("veiculo_id, veiculos(id, marca, modelo, ano_de)")
      .eq("user_id", user.id);

    if (meus?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVeiculos(meus.map((m: any) => ({
        id: m.veiculo_id,
        label: `${m.veiculos?.marca || ""} ${m.veiculos?.modelo || ""} ${m.veiculos?.ano_de || ""}`.trim(),
      })));
    }

    // Also load all vehicles as options
    const { data: todos } = await supabase
      .from("veiculos")
      .select("id, marca, modelo, ano_de")
      .order("marca")
      .limit(50);

    if (todos?.length && !meus?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVeiculos(todos.map((v: any) => ({
        id: v.id,
        label: `${v.marca} ${v.modelo} ${v.ano_de || ""}`,
      })));
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          veiculo_id: veiculoId,
          user_id: userId,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.answer || "Desculpe, nao consegui processar sua pergunta.",
        source: data.source,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Erro de conexao. Verifique sua internet.",
        source: "error",
      }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-indigo-400">&larr;</Link>
          <div>
            <h1 className="text-sm font-bold text-white">Assistente Panther</h1>
            <p className="text-[10px] text-emerald-400">Online</p>
          </div>
        </div>
        <select
          value={veiculoId || ""}
          onChange={(e) => setVeiculoId(e.target.value ? Number(e.target.value) : null)}
          className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 max-w-[180px]"
        >
          <option value="">Selecione o veiculo</option>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id} className="capitalize">{v.label}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-br-md"
                : "bg-slate-800 text-slate-200 rounded-bl-md"
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.source && msg.source !== "template" && msg.role === "assistant" && (
                <div className="text-[9px] mt-1.5 opacity-50">
                  {msg.source === "banco" ? "Resposta do banco de dados" : msg.source === "ai" ? "Resposta IA" : ""}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-400">
              Digitando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Pergunte sobre lubrificantes, filtros, manutencao..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Enviar
          </button>
        </div>
        {veiculoId && (
          <div className="text-[10px] text-slate-500 mt-1.5 px-1">
            Contexto: {veiculos.find((v) => v.id === veiculoId)?.label}
          </div>
        )}
      </div>
    </div>
  );
}
