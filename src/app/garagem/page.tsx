"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;

// Fotos padrao por marca (silhuetas de carros reais)
const defaultCarImages: Record<string, string> = {
  chevrolet: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop&crop=center",
  fiat: "https://images.unsplash.com/photo-1606611013016-969c19ba27a5?w=400&h=250&fit=crop&crop=center",
  volkswagen: "https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=400&h=250&fit=crop&crop=center",
  toyota: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=250&fit=crop&crop=center",
  hyundai: "https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=400&h=250&fit=crop&crop=center",
  honda: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=250&fit=crop&crop=center",
  nissan: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400&h=250&fit=crop&crop=center",
  jeep: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=250&fit=crop&crop=center",
  renault: "https://images.unsplash.com/photo-1549317661-bd32c8ce0afe?w=400&h=250&fit=crop&crop=center",
  default: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=250&fit=crop&crop=center",
};

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

  function getCarImage(marca: string) {
    return defaultCarImages[marca?.toLowerCase()] || defaultCarImages.default;
  }

  if (loading) return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <div className="h-7 w-40 rounded skeleton-shimmer mb-6" />
      <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-52 rounded-2xl skeleton-shimmer" />)}</div>
      <BottomNav />
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8 lg:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Minha Garagem</h1>
          <button onClick={() => setAddMode(!addMode)} className="text-sm text-primary font-medium pressable">
            {addMode ? "Cancelar" : "+ Adicionar"}
          </button>
        </div>

        {/* Adicionar veiculo */}
        {addMode && (
          <div className="mb-6 space-y-3 slide-in">
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
            <button onClick={add} disabled={!selId} className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 pressable">Salvar</button>
          </div>
        )}

        {/* Veiculos na garagem — cards com foto */}
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
          <div className="space-y-4 animate-stagger">
            {meusVeiculos.map((mv: A) => {
              const marca = mv.veiculos?.marca || "";
              const modelo = mv.veiculos?.modelo || "";
              const ano = mv.veiculos?.ano_de;
              const imgUrl = getCarImage(marca);

              return (
                <Link key={mv.id} href={`/veiculo/${mv.veiculos?.id}`} className="block pressable-lift">
                  <div className="rounded-2xl overflow-hidden bg-foreground/[0.03]">
                    {/* Foto do carro */}
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={imgUrl}
                        alt={`${marca} ${modelo}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Info sobre a foto */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-lg font-bold text-white capitalize">{marca} {modelo}</p>
                        <p className="text-[13px] text-white/70">
                          {[ano, mv.veiculos?.codigo_motor].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      {/* Placa badge */}
                      {mv.placa && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                          <span className="text-[11px] font-mono font-semibold text-white">{mv.placa}</span>
                        </div>
                      )}

                      {/* Botao editar foto */}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* TODO: upload foto */ }}
                        className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                        aria-label="Editar foto"
                      >
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Info bar inferior */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        {mv.apelido && <span className="text-[13px] text-muted-foreground">{mv.apelido}</span>}
                        {mv.km_atual && (
                          <span className="text-[12px] text-muted-foreground/50">{Number(mv.km_atual).toLocaleString()} km</span>
                        )}
                      </div>
                      <svg className="h-4 w-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
