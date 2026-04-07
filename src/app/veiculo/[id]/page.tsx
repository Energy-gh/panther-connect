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
  const [tab, setTab] = useState("specs");
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

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-5 w-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
  if (!v) return <div className="flex h-screen items-center justify-center text-muted-foreground">Veiculo nao encontrado</div>;

  const o = oleo[0] || {};
  const tabs = [
    { id: "specs", label: "Fluidos" },
    { id: "filtros", label: "Filtros" },
    { id: "marcas", label: "Marcas" },
  ];

  return (
    <>
      <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8 lg:pb-8">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </Link>

        {/* Vehicle name */}
        <h1 className="text-2xl font-bold capitalize">{v.marca} {v.modelo}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {[v.ano_de, v.codigo_motor, v.tipo_cambio].filter(Boolean).join(" · ")}
        </p>

        {/* Quick summary — uma linha, sem cards */}
        {o.viscosidade_sae && (
          <div className="flex items-center gap-3 mt-4 py-3 text-sm">
            <span className="font-semibold text-primary">{o.viscosidade_sae}</span>
            <span className="text-muted-foreground/30">|</span>
            <span>{o.capacidade_com_filtro_litros ? `${o.capacidade_com_filtro_litros}L` : ""}</span>
            <span className="text-muted-foreground/30">|</span>
            <span>{o.intervalo_troca_km ? `${(o.intervalo_troca_km / 1000)}k km` : ""}</span>
            {o.aprovacao_oem && <><span className="text-muted-foreground/30">|</span><span className="text-muted-foreground">{o.aprovacao_oem}</span></>}
          </div>
        )}

        {/* Tabs — simples, sem shadcn */}
        <div className="flex gap-0 mt-4 mb-6 border-b border-foreground/5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                tab === t.id ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground"
              }`}>
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />}
            </button>
          ))}
        </div>

        {/* FLUIDOS */}
        {tab === "specs" && (
          <div className="space-y-6">
            {o.viscosidade_sae && (
              <Section title="Oleo motor">
                <Row label="SAE" value={o.viscosidade_sae} />
                {o.categoria_api && <Row label="API" value={o.categoria_api} />}
                {o.categoria_acea && <Row label="ACEA" value={o.categoria_acea} />}
                {o.aprovacao_oem && <Row label="OEM" value={o.aprovacao_oem} />}
                {o.tipo_base && <Row label="Base" value={o.tipo_base} />}
                {o.capacidade_com_filtro_litros && <Row label="Capacidade" value={`${o.capacidade_com_filtro_litros}L (com filtro)`} />}
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

        {/* FILTROS */}
        {tab === "filtros" && (
          <div className="space-y-6">
            {filtrosCrossref.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Dados nao disponiveis</p>
            ) : (
              filtrosCrossref.map((fc, i) => (
                <Section key={i} title={`Filtro de ${fc.tipo_filtro}`} subtitle={fc.oem_codigo && `OEM ${fc.oem_codigo}`}>
                  {["tecfil", "mann", "wega", "fram", "mahle"].map((brand) => {
                    const code = fc[brand];
                    if (!code) return null;
                    return <Row key={brand} label={brand.charAt(0).toUpperCase() + brand.slice(1)} value={code} highlight />;
                  })}
                </Section>
              ))
            )}
          </div>
        )}

        {/* MARCAS LUBRIFICANTES */}
        {tab === "marcas" && (
          <div>
            {specOem && (
              <p className="text-sm text-muted-foreground mb-4">
                Especificacao: <span className="text-foreground font-medium">{specOem.viscosidade} {specOem.oem_aprovacao}</span>
              </p>
            )}
            {produtos.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Produtos nao mapeados</p>
            ) : (
              <div className="divide-y divide-foreground/5">
                {produtos.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 py-4">
                    {/* Espaco para logo/foto — so mostra quando tiver */}
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.marca} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-foreground/5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-muted-foreground">{p.marca}</p>
                      <p className="text-[15px] font-medium truncate">{p.nome_produto}</p>
                    </div>
                    <span className="text-xs text-muted-foreground/60 shrink-0">{p.viscosidade}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold capitalize">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground font-mono">{subtitle}</span>}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-foreground/[0.03] last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[13px] text-right ml-4 max-w-[60%] ${highlight ? "font-semibold text-primary" : "font-medium"}`}>{value}</span>
    </div>
  );
}
