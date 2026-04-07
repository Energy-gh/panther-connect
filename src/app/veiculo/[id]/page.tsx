"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

export default function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [v, setV] = useState<R | null>(null);
  const [oleo, setOleo] = useState<R[]>([]);
  const [cambio, setCambio] = useState<R[]>([]);
  const [fluidos, setFluidos] = useState<R[]>([]);
  const [filtrosCrossref, setFiltrosCrossref] = useState<R[]>([]);
  const [produtos, setProdutos] = useState<R[]>([]);
  const [specOem, setSpecOem] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumo");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => { if (id) { check(); load(); } }, [id]);

  async function check() { const { data: { user } } = await supabase.auth.getUser(); if (!user) router.push("/"); }

  async function load() {
    setLoading(true);
    const [vR, oR, cR, fR, fcR, vsR] = await Promise.all([
      supabase.from("veiculos").select("*").eq("id", id).single(),
      supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", id),
      supabase.from("specs_cambio").select("*").eq("veiculo_id", id),
      supabase.from("specs_fluidos").select("*").eq("veiculo_id", id),
      supabase.from("filtros_crossref").select("*").eq("veiculo_id", id),
      supabase.from("veiculo_specs").select("*, specs_oem(*)").eq("veiculo_id", id).eq("sistema", "motor").limit(1),
    ]);
    if (vR.data) setV(vR.data);
    if (oR.data) setOleo(oR.data);
    if (cR.data) setCambio(cR.data);
    if (fR.data) setFluidos(fR.data);
    if (fcR.data) setFiltrosCrossref(fcR.data);
    if (vsR.data?.[0]) {
      if (vsR.data[0].specs_oem) setSpecOem(vsR.data[0].specs_oem);
      if (vsR.data[0].spec_oem_id) {
        const { data: p } = await supabase.from("produtos_lubrificantes").select("*").eq("spec_oem_id", vsR.data[0].spec_oem_id).order("marca");
        if (p) setProdutos(p);
      }
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="pb-24">
      <div className="px-5 pt-5 pb-6">
        <div className="h-10 w-10 rounded-full skeleton-shimmer mb-4" />
        <div className="h-8 w-56 rounded skeleton-shimmer mb-2" />
        <div className="h-5 w-40 rounded skeleton-shimmer mb-4" />
        <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-9 w-24 rounded-full skeleton-shimmer" />)}</div>
      </div>
      <div className="flex gap-4 px-5 py-3 border-b border-foreground/5">{[...Array(4)].map((_, i) => <div key={i} className="h-5 w-16 rounded skeleton-shimmer" />)}</div>
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3"><div className="h-32 col-span-2 rounded-2xl skeleton-shimmer" /><div className="h-24 rounded-2xl skeleton-shimmer" /><div className="h-24 rounded-2xl skeleton-shimmer" /></div>
        <div className="flex gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-48 w-40 shrink-0 rounded-2xl skeleton-shimmer" />)}</div>
      </div>
      <BottomNav />
    </div>
  );
  if (!v) return <div className="flex h-screen items-center justify-center text-muted-foreground">Veiculo nao encontrado</div>;

  const o = oleo[0] || {};
  const tabs = [
    { id: "resumo", label: "Resumo" },
    { id: "oleos", label: "Oleos" },
    { id: "filtros", label: "Filtros" },
    { id: "fluidos", label: "Fluidos" },
  ];

  // Build quick info chips
  const chips: { label: string; value: string; accent?: boolean }[] = [];
  if (o.viscosidade_sae) chips.push({ label: "SAE", value: o.viscosidade_sae, accent: true });
  if (o.capacidade_com_filtro_litros) chips.push({ label: "Volume", value: `${o.capacidade_com_filtro_litros}L` });
  if (o.intervalo_troca_km) chips.push({ label: "Troca", value: `${(o.intervalo_troca_km / 1000)}k km` });
  if (o.aprovacao_oem) chips.push({ label: "Spec", value: o.aprovacao_oem });

  return (
    <>
      <div className="pb-24 lg:pb-0 content-reveal">
        {/* Hero header — full width, como iFood mostra o restaurante */}
        <div className="relative bg-gradient-to-b from-foreground/[0.04] to-background px-5 pt-5 pb-6 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors mb-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-2xl font-bold capitalize">{v.marca} {v.modelo}</h1>
          <p className="text-[15px] text-muted-foreground mt-1">
            {[v.ano_de, v.codigo_motor, v.tipo_cambio].filter(Boolean).join(" · ")}
          </p>

          {/* Chips — scroll horizontal, como categorias do iFood */}
          {chips.length > 0 && (
            <div className="flex gap-2 mt-4 overflow-x-auto -mx-5 px-5 scrollbar-none">
              {chips.map((c, i) => (
                <div key={i} className={`shrink-0 px-4 py-2 rounded-full text-[13px] ${
                  c.accent ? "bg-primary/15 text-primary font-semibold" : "bg-foreground/5 text-foreground"
                }`}>
                  <span className="text-muted-foreground/60 mr-1">{c.label}</span>{c.value}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs sticky — como abas do iFood */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-foreground/5">
          <div className="flex gap-0 px-5 lg:px-8 overflow-x-auto scrollbar-none">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`shrink-0 px-4 py-3 text-[14px] font-medium transition-colors relative whitespace-nowrap ${
                  tab === t.id ? "text-foreground" : "text-muted-foreground/50"
                }`}>
                {t.label}
                {tab === t.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-5 lg:px-8 max-w-lg mx-auto lg:max-w-2xl">

          {/* RESUMO — overview visual */}
          {tab === "resumo" && (
            <div className="space-y-8">
              {/* Oleo motor — destaque principal */}
              {o.viscosidade_sae && (
                <div>
                  <h2 className="text-[13px] text-muted-foreground mb-3">Oleo recomendado</h2>
                  <div className="rounded-2xl bg-foreground/[0.03] p-5">
                    <p className="text-3xl font-bold text-primary">{o.viscosidade_sae}</p>
                    <p className="text-[15px] text-muted-foreground mt-1">{o.aprovacao_oem || ""} {o.categoria_api ? `· API ${o.categoria_api}` : ""}</p>
                    <div className="flex gap-6 mt-4">
                      {o.capacidade_com_filtro_litros && (
                        <div>
                          <p className="text-xl font-bold">{o.capacidade_com_filtro_litros}L</p>
                          <p className="text-[12px] text-muted-foreground">com filtro</p>
                        </div>
                      )}
                      {o.intervalo_troca_km && (
                        <div>
                          <p className="text-xl font-bold">{Number(o.intervalo_troca_km).toLocaleString()}</p>
                          <p className="text-[12px] text-muted-foreground">km entre trocas</p>
                        </div>
                      )}
                      {o.tipo_base && (
                        <div>
                          <p className="text-xl font-bold">{o.tipo_base}</p>
                          <p className="text-[12px] text-muted-foreground">base</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* O que fazer — checklist de acao */}
              {(o.viscosidade_sae || filtrosCrossref.length > 0) && (
                <div>
                  <h2 className="text-[13px] text-muted-foreground mb-3">O que fazer neste veiculo</h2>
                  <div className="space-y-2">
                    {o.viscosidade_sae && (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-foreground/[0.03]">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5" /></svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-medium">Oleo motor {o.viscosidade_sae}</p>
                          <p className="text-[11px] text-muted-foreground">{o.capacidade_com_filtro_litros ? `${o.capacidade_com_filtro_litros}L com filtro` : ""}</p>
                        </div>
                        <button onClick={() => setTab("oleos")} className="text-[12px] text-primary font-medium pressable">Ver marcas</button>
                      </div>
                    )}
                    {filtrosCrossref.slice(0, 3).map((fc, i) => (
                      <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-foreground/[0.03]">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-medium capitalize">Filtro de {fc.tipo_filtro}</p>
                          <p className="text-[11px] text-muted-foreground">{fc.tecfil || fc.mann || fc.wega || ""}</p>
                        </div>
                        <button onClick={() => setTab("filtros")} className="text-[12px] text-primary font-medium pressable">Ver codigos</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salvar na garagem + Compartilhar */}
              <div className="flex gap-2">
                <Link href="/garagem" className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] text-[13px] font-medium transition-colors pressable">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Salvar na garagem
                </Link>
                <button onClick={() => { navigator.clipboard.writeText(`${v.marca} ${v.modelo} ${v.ano_de}: ${o.viscosidade_sae || ""} ${o.aprovacao_oem || ""}`); }}
                  className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-foreground/[0.03] hover:bg-foreground/[0.06] text-[13px] font-medium transition-colors pressable">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                  Compartilhar
                </button>
              </div>

              {/* Banner servicos — soft sell */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold">Envie um orcamento</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Crie um orcamento profissional com estes itens e envie pelo WhatsApp.</p>
                    <Link href="/orcamento" className="inline-block mt-2 text-[13px] text-primary font-medium pressable">
                      Criar orcamento →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Perguntar ao AI */}
              <Link href="/chat" className="flex items-center gap-3 p-4 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors pressable">
                <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium">Tem duvidas sobre este carro?</p>
                  <p className="text-[12px] text-muted-foreground">Pergunte ao assistente Panther</p>
                </div>
              </Link>

              {/* Produtos — cards visuais estilo iFood */}
              {produtos.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[13px] text-muted-foreground">Oleos compativeis</h2>
                    <button onClick={() => setTab("oleos")} className="text-[13px] text-primary font-medium">Ver todos</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-none">
                    {produtos.slice(0, 6).map((p, i) => (
                      <div key={i} className="shrink-0 w-40 rounded-2xl bg-foreground/[0.03] overflow-hidden group cursor-pointer pressable-lift">
                        <div className="h-28 bg-gradient-to-br from-foreground/[0.04] to-foreground/[0.02] flex items-center justify-center">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt={p.marca} className="h-20 object-contain" />
                          ) : (
                            <div className="h-16 w-8 rounded bg-foreground/[0.04]" />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[11px] text-muted-foreground">{p.marca}</p>
                          <p className="text-[13px] font-medium leading-tight mt-0.5 group-hover:text-primary transition-colors line-clamp-2">{p.nome_produto}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-1">{p.viscosidade}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtros — preview horizontal */}
              {filtrosCrossref.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[13px] text-muted-foreground">Filtros compativeis</h2>
                    <button onClick={() => setTab("filtros")} className="text-[13px] text-primary font-medium">Ver todos</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-none">
                    {filtrosCrossref.map((fc, i) => (
                      <div key={i} className="shrink-0 w-36 rounded-2xl bg-foreground/[0.03] p-4">
                        <p className="text-[11px] text-muted-foreground capitalize">Filtro de {fc.tipo_filtro}</p>
                        <div className="mt-2 space-y-1.5">
                          {["tecfil", "mann", "wega"].map((brand) => {
                            const code = fc[brand];
                            if (!code) return null;
                            return (
                              <div key={brand} className="flex justify-between items-center">
                                <span className="text-[11px] text-muted-foreground/60 capitalize">{brand}</span>
                                <span className="text-[12px] font-semibold text-primary">{code}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fluidos rapido */}
              {(cambio.length > 0 || fluidos.length > 0) && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[13px] text-muted-foreground">Outros fluidos</h2>
                    <button onClick={() => setTab("fluidos")} className="text-[13px] text-primary font-medium">Detalhes</button>
                  </div>
                  <div className="space-y-0 divide-y divide-foreground/5">
                    {cambio.map((c, i) => (
                      <div key={i} className="flex justify-between items-center py-3">
                        <div>
                          <p className="text-[14px] font-medium capitalize">Cambio {c.tipo}</p>
                          <p className="text-[12px] text-muted-foreground">{c.especificacao || c.fluido || ""}</p>
                        </div>
                        {c.capacidade_litros && <span className="text-[13px] font-semibold">{c.capacidade_litros}L</span>}
                      </div>
                    ))}
                    {fluidos.map((f, i) => (
                      <div key={i} className="flex justify-between items-center py-3">
                        <div>
                          <p className="text-[14px] font-medium capitalize">{String(f.tipo).replace("_", " ")}</p>
                          <p className="text-[12px] text-muted-foreground">{f.especificacao || f.fluido || ""}</p>
                        </div>
                        {f.capacidade_litros && <span className="text-[13px] font-semibold">{f.capacidade_litros}L</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OLEOS — todos os produtos */}
          {tab === "oleos" && (
            <div>
              {specOem && (
                <div className="rounded-2xl bg-primary/5 p-4 mb-5">
                  <p className="text-[12px] text-primary font-medium">Especificacao requerida</p>
                  <p className="text-[15px] font-semibold mt-0.5">{specOem.viscosidade} — {specOem.oem_aprovacao}</p>
                </div>
              )}
              {produtos.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">Produtos nao mapeados</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {produtos.map((p, i) => (
                    <div key={i} className="rounded-2xl bg-foreground/[0.03] overflow-hidden group cursor-pointer pressable-lift">
                      <div className="h-32 bg-gradient-to-br from-foreground/[0.04] to-foreground/[0.02] flex items-center justify-center">
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt={p.marca} className="h-24 object-contain" />
                        ) : (
                          <div className="h-18 w-10 rounded bg-foreground/[0.04]" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-[11px] text-muted-foreground">{p.marca}</p>
                        <p className="text-[14px] font-medium leading-tight mt-0.5 group-hover:text-primary transition-colors">{p.nome_produto}</p>
                        <p className="text-[12px] text-muted-foreground/60 mt-1.5">{p.viscosidade} · {p.tipo_base}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FILTROS */}
          {tab === "filtros" && (
            <div className="space-y-5">
              {filtrosCrossref.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">Dados nao disponiveis</p>
              ) : (
                filtrosCrossref.map((fc, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[14px] font-semibold capitalize">Filtro de {fc.tipo_filtro}</h3>
                      {fc.oem_codigo && <span className="text-[11px] text-muted-foreground font-mono">OEM {fc.oem_codigo}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                      {["tecfil", "mann", "wega", "fram", "mahle"].map((brand) => {
                        const code = fc[brand];
                        if (!code) return null;
                        return (
                          <div key={brand} className="rounded-xl bg-foreground/[0.03] p-3.5 group cursor-pointer hover:bg-foreground/[0.06] transition-colors pressable">
                            <p className="text-[11px] text-muted-foreground capitalize">{brand}</p>
                            <p className="text-[15px] font-bold text-primary mt-0.5">{code}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* FLUIDOS */}
          {tab === "fluidos" && (
            <div className="space-y-6">
              {o.viscosidade_sae && (
                <Section title="Oleo motor">
                  <Row label="SAE" value={o.viscosidade_sae} />
                  {o.categoria_api && <Row label="API" value={o.categoria_api} />}
                  {o.aprovacao_oem && <Row label="OEM" value={o.aprovacao_oem} />}
                  {o.tipo_base && <Row label="Base" value={o.tipo_base} />}
                  {o.capacidade_com_filtro_litros && <Row label="Capacidade" value={`${o.capacidade_com_filtro_litros}L`} />}
                  {o.intervalo_troca_km && <Row label="Troca" value={`${Number(o.intervalo_troca_km).toLocaleString()} km`} />}
                </Section>
              )}
              {cambio.map((c, i) => (
                <Section key={i} title={`Cambio ${c.tipo}`}>
                  {c.fluido && <Row label="Fluido" value={c.fluido} />}
                  {c.viscosidade && <Row label="Viscosidade" value={c.viscosidade} />}
                  {c.especificacao && <Row label="Spec" value={c.especificacao} />}
                  {c.capacidade_litros && <Row label="Capacidade" value={`${c.capacidade_litros}L`} />}
                  {c.intervalo_troca_km && <Row label="Troca" value={`${Number(c.intervalo_troca_km).toLocaleString()} km`} />}
                </Section>
              ))}
              {fluidos.map((f, i) => (
                <Section key={i} title={String(f.tipo).replace("_", " ")}>
                  {(f.fluido || f.especificacao) && <Row label="Tipo" value={f.especificacao || f.fluido} />}
                  {f.capacidade_litros && <Row label="Capacidade" value={`${f.capacidade_litros}L`} />}
                  {f.concentracao && <Row label="Proporcao" value={f.concentracao} />}
                </Section>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold capitalize mb-3">{title}</h3>
      <div className="rounded-2xl bg-foreground/[0.03] divide-y divide-foreground/5 overflow-hidden">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start px-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-right ml-4 max-w-[60%]">{value}</span>
    </div>
  );
}
