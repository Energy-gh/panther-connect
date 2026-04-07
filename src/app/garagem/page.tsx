"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;

export default function GaragemPage() {
  const [meusVeiculos, setMeusVeiculos] = useState<A[]>([]);
  const [veiculosAll, setVeiculosAll] = useState<A[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [selId, setSelId] = useState("");
  const [apelido, setApelido] = useState("");
  const [placa, setPlaca] = useState("");
  const [km, setKm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    const { data } = await supabase.from("meus_veiculos").select("*, veiculos(id, marca, modelo, ano_de, codigo_motor)").eq("user_id", user.id);
    if (data) setMeusVeiculos(data);
    const { data: all } = await supabase.from("veiculos").select("id, marca, modelo, ano_de").order("marca").limit(100);
    if (all) setVeiculosAll(all);
    setLoading(false);
  }

  async function add() {
    if (!selId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("meus_veiculos").insert({ user_id: user.id, veiculo_id: parseInt(selId), apelido: apelido || null, placa: placa || null, km_atual: km ? parseInt(km) : null });
    setAddMode(false); setApelido(""); setPlaca(""); setKm(""); setSelId("");
    load();
  }

  if (loading) return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <div className="h-7 w-40 rounded skeleton-shimmer mb-6" />
      <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton-shimmer" />)}</div>
      <BottomNav />
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8 lg:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Minha Garagem</h1>
          <button onClick={() => setAddMode(!addMode)} className="text-sm text-primary font-medium">
            {addMode ? "Cancelar" : "+ Adicionar"}
          </button>
        </div>

        {addMode && (
          <div className="mb-6 space-y-3">
            <select value={selId} onChange={(e) => setSelId(e.target.value)}
              className="w-full h-12 appearance-none rounded-xl bg-foreground/5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10" aria-label="Veiculo">
              <option value="">Selecione o veiculo</option>
              {veiculosAll.map((v: A) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_de || ""}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Apelido" className="h-11 rounded-xl bg-foreground/5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10" />
              <input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="Placa" className="h-11 rounded-xl bg-foreground/5 px-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-foreground/10" />
              <input type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="KM" className="h-11 rounded-xl bg-foreground/5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10" />
            </div>
            <button onClick={add} disabled={!selId} className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30">Salvar</button>
          </div>
        )}

        {meusVeiculos.length === 0 ? (
          <div className="text-center py-16 page-enter">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-foreground/[0.03] mb-5">
              <svg className="h-9 w-9 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6M3 11h18" />
              </svg>
            </div>
            <h3 className="text-[16px] font-semibold mb-1.5">Sua garagem esta vazia</h3>
            <p className="text-[13px] text-muted-foreground/60 mb-6 max-w-[240px] mx-auto">Adicione seus veiculos para acessar especificacoes rapidamente</p>
            <button onClick={() => setAddMode(true)} className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold pressable">
              + Adicionar primeiro veiculo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-foreground/5">
            {meusVeiculos.map((mv: A) => (
              <Link key={mv.id} href={`/veiculo/${mv.veiculos?.id}`} className="flex items-center justify-between py-4 group">
                <div>
                  <p className="text-[15px] font-medium capitalize group-hover:text-primary transition-colors">
                    {mv.veiculos?.marca} {mv.veiculos?.modelo}
                    {mv.veiculos?.ano_de && <span className="text-muted-foreground font-normal ml-1.5">{mv.veiculos.ano_de}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {mv.apelido && <span className="text-[13px] text-muted-foreground">{mv.apelido}</span>}
                    {mv.placa && <span className="text-[11px] font-mono text-muted-foreground/60 bg-foreground/5 px-1.5 py-0.5 rounded">{mv.placa}</span>}
                    {mv.km_atual && <span className="text-[11px] text-muted-foreground/60">{Number(mv.km_atual).toLocaleString()} km</span>}
                  </div>
                </div>
                <svg className="h-4 w-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
