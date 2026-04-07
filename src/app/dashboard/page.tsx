"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Veiculo {
  id: number; marca: string; modelo: string; ano_de: number | null;
  codigo_motor: string | null; confianca: string | null; campos_encontrados: number | null;
}

const stories = [
  { brand: "Shell", color: "#DD1D21" },
  { brand: "Mobil", color: "#1A47B8" },
  { brand: "Castrol", color: "#00984A" },
  { brand: "Petronas", color: "#00695C" },
  { brand: "Motul", color: "#E53935" },
  { brand: "Liqui Moly", color: "#0D47A1" },
];

type Mode = "home" | "placa" | "veiculo";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("home");
  const [ready, setReady] = useState(false);

  // Vehicle search
  const [marcas, setMarcas] = useState<string[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [selMarca, setSelMarca] = useState("");
  const [selAno, setSelAno] = useState("");
  const [selModelo, setSelModelo] = useState("");
  const [resultados, setResultados] = useState<Veiculo[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [loading, setLoading] = useState(false);

  // Plate search
  const [placaInput, setPlacaInput] = useState("");
  const [placaLoading, setPlacaLoading] = useState(false);
  const [placaError, setPlacaError] = useState("");

  useEffect(() => { init(); }, []);
  useEffect(() => { if (selMarca) loadAnos(); }, [selMarca]);
  useEffect(() => { if (selAno) loadModelos(); }, [selAno]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    const { data } = await supabase.from("veiculos").select("marca").order("marca");
    if (data) setMarcas([...new Set(data.map((d) => d.marca))].sort());
    setReady(true);
  }

  async function loadAnos() {
    setSelAno(""); setSelModelo(""); setAnos([]); setModelos([]); setBuscou(false);
    const { data } = await supabase.from("veiculos").select("ano_de").eq("marca", selMarca).order("ano_de", { ascending: false });
    if (data) setAnos([...new Set(data.map((d) => d.ano_de).filter(Boolean))] as number[]);
  }

  async function loadModelos() {
    setSelModelo(""); setModelos([]); setBuscou(false);
    const { data } = await supabase.from("veiculos").select("modelo").eq("marca", selMarca).eq("ano_de", parseInt(selAno)).order("modelo");
    if (data) {
      const unique = [...new Set(data.map((d) => d.modelo))].sort();
      setModelos(unique);
      if (unique.length === 1) setSelModelo(unique[0]);
    }
  }

  async function buscar() {
    setLoading(true); setBuscou(true);
    let q = supabase.from("veiculos").select("*").eq("marca", selMarca);
    if (selAno) q = q.eq("ano_de", parseInt(selAno));
    if (selModelo) q = q.eq("modelo", selModelo);
    const { data } = await q.order("ano_de", { ascending: false });
    if (data?.length === 1) { router.push(`/veiculo/${data[0].id}`); return; }
    setResultados(data || []);
    setLoading(false);
  }

  async function searchPlaca() {
    if (placaInput.length < 7) return;
    setPlacaLoading(true); setPlacaError("");
    try {
      const res = await fetch("/api/placa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placa: placaInput }) });
      const d = await res.json();
      if (d.veiculo_id) { router.push(`/veiculo/${d.veiculo_id}`); return; }
      setPlacaError("Veiculo nao encontrado. Tente buscar por marca e modelo.");
    } catch { setPlacaError("Erro na consulta."); }
    setPlacaLoading(false);
  }

  function goBack() {
    setMode("home");
    setBuscou(false);
    setResultados([]);
    setPlacaError("");
    setSelMarca(""); setSelAno(""); setSelModelo("");
    setPlacaInput("");
  }

  if (!ready) return <div className="flex h-screen items-center justify-center"><div className="h-5 w-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-lg px-5 py-6 lg:max-w-2xl lg:px-8 lg:py-10">

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto pb-6 -mx-5 px-5 scrollbar-none">
        {stories.map((s) => (
          <button key={s.brand} className="flex flex-col items-center gap-1.5 shrink-0 group">
            <div className="h-16 w-16 rounded-full p-[2px]" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}88)` }}>
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">{s.brand.slice(0, 2).toUpperCase()}</span>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{s.brand}</span>
          </button>
        ))}
      </div>

      {/* HOME — dois CTAs */}
      {mode === "home" && (
        <div className="mt-4">
          <h1 className="text-2xl font-bold mb-2">Encontre as especificacoes</h1>
          <p className="text-sm text-muted-foreground mb-8">Descubra o oleo, filtros e fluidos corretos para seu veiculo.</p>

          <div className="space-y-3">
            <button onClick={() => setMode("placa")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors text-left group">
              <div className="h-12 w-12 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0 group-hover:bg-foreground/10 transition-colors">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h14.25c.621 0 1.125.504 1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621-.504 1.125-1.125 1.125H4.875a1.125 1.125 0 01-1.125-1.125V4.875z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold">Buscar por placa</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">Digite a placa e encontre tudo automaticamente</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>

            <button onClick={() => setMode("veiculo")}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors text-left group">
              <div className="h-12 w-12 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0 group-hover:bg-foreground/10 transition-colors">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold">Buscar por veiculo</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">Selecione marca, ano e modelo</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* BUSCA POR PLACA */}
      {mode === "placa" && (
        <div className="mt-4">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Voltar
          </button>

          <h2 className="text-xl font-bold mb-1">Buscar por placa</h2>
          <p className="text-sm text-muted-foreground mb-6">Digite a placa do seu veiculo</p>

          <div className="flex gap-2 mb-4">
            <input
              value={placaInput}
              onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
              maxLength={7}
              placeholder="ABC1D23"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && searchPlaca()}
              className="flex-1 h-14 rounded-xl bg-foreground/5 px-5 text-lg font-mono tracking-[0.3em] uppercase text-center placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <button onClick={searchPlaca} disabled={placaInput.length < 7 || placaLoading}
            className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 transition-opacity">
            {placaLoading ? "Buscando..." : "Buscar"}
          </button>
          {placaError && <p className="text-sm text-destructive mt-3">{placaError}</p>}
        </div>
      )}

      {/* BUSCA POR VEICULO */}
      {mode === "veiculo" && (
        <div className="mt-4">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Voltar
          </button>

          <h2 className="text-xl font-bold mb-1">Buscar por veiculo</h2>
          <p className="text-sm text-muted-foreground mb-6">Selecione marca, ano e modelo</p>

          <div className="space-y-3 mb-4">
            <Select value={selMarca} onChange={setSelMarca} options={marcas} placeholder="Marca" />
            <Select value={selAno} onChange={setSelAno} options={anos.map(String)} placeholder="Ano" disabled={!selMarca} />
            <Select value={selModelo} onChange={setSelModelo} options={modelos} placeholder="Modelo" disabled={!selAno} />
          </div>
          <button onClick={buscar} disabled={!selMarca || loading}
            className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 transition-opacity">
            {loading ? "Buscando..." : "Buscar"}
          </button>

          {/* Resultados */}
          {buscou && resultados.length > 0 && (
            <div className="mt-6 divide-y divide-foreground/5">
              {resultados.map((v) => (
                <Link key={v.id} href={`/veiculo/${v.id}`} className="flex items-center justify-between py-4 group">
                  <div>
                    <p className="text-[15px] font-medium capitalize">{v.marca} {v.modelo}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{v.ano_de}{v.codigo_motor && ` · ${v.codigo_motor}`}</p>
                  </div>
                  <svg className="h-4 w-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          )}
          {buscou && resultados.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-10">Nenhum veiculo encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string; disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="w-full h-12 appearance-none rounded-xl bg-foreground/5 px-4 text-sm capitalize disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-opacity"
        aria-label={placeholder}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
