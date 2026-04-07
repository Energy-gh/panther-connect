"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  useEffect(() => { if (id) { checkAuth(); loadData(); } }, [id]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push("/");
  }

  async function loadData() {
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
        const { data: prods } = await supabase.from("produtos_lubrificantes").select("*").eq("spec_oem_id", vsR.data[0].spec_oem_id).order("destaque", { ascending: false }).order("marca");
        if (prods) setProdutos(prods);
      }
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <BottomNav />
    </div>
  );

  if (!v) return <div className="flex min-h-screen items-center justify-center text-destructive">Veiculo nao encontrado</div>;

  const o = oleo[0] || {};
  const filterBrands = ["tecfil", "mann", "wega", "fram", "mahle"];

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </Link>

        {/* Vehicle Header — compacto */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold capitalize lg:text-xl">{v.marca} {v.modelo}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {v.ano_de && <span className="text-primary font-semibold">{v.ano_de}</span>}
              {v.codigo_motor && <><span>·</span><span>{v.codigo_motor}</span></>}
              {v.tipo_cambio && <><span>·</span><span>{v.tipo_cambio}</span></>}
            </div>
          </div>
          <Badge variant={v.confianca === "alta" ? "default" : v.confianca === "media" ? "secondary" : "destructive"}>
            {v.confianca}
          </Badge>
        </div>

        {/* Resumo rapido — dados essenciais em grid */}
        {o.viscosidade_sae && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <QuickStat label="Oleo Motor" value={o.viscosidade_sae} sub={o.aprovacao_oem} />
            <QuickStat label="Capacidade" value={o.capacidade_com_filtro_litros ? `${o.capacidade_com_filtro_litros}L` : "-"} sub="com filtro" />
            <QuickStat label="Troca" value={o.intervalo_troca_km ? `${(o.intervalo_troca_km / 1000)}k km` : "-"} sub={o.intervalo_troca_meses ? `${o.intervalo_troca_meses} meses` : ""} />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="specs">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="specs" className="flex-1 text-xs">Fluidos</TabsTrigger>
            <TabsTrigger value="filtros" className="flex-1 text-xs">Filtros {filtrosCrossref.length > 0 && `(${filtrosCrossref.length})`}</TabsTrigger>
            <TabsTrigger value="lubrificantes" className="flex-1 text-xs">Marcas {produtos.length > 0 && `(${produtos.length})`}</TabsTrigger>
          </TabsList>

          {/* FLUIDOS TAB — compacto */}
          <TabsContent value="specs" className="space-y-2">
            {/* Oleo Motor */}
            {o.viscosidade_sae && (
              <CompactSpec icon="💧" title="Oleo Motor" rows={[
                o.viscosidade_sae && ["SAE", o.viscosidade_sae],
                o.categoria_api && ["API", o.categoria_api],
                o.categoria_acea && ["ACEA", o.categoria_acea],
                o.aprovacao_oem && ["OEM", o.aprovacao_oem],
                o.tipo_base && ["Base", o.tipo_base],
              ].filter(Boolean) as [string, string][]} />
            )}

            {/* Cambios */}
            {cambio.map((c, i) => (
              <CompactSpec key={i} icon="⚙️" title={`Cambio ${c.tipo}`} rows={[
                c.fluido && ["Fluido", c.fluido],
                c.viscosidade && ["Viscosidade", c.viscosidade],
                c.especificacao && ["Spec", c.especificacao],
                c.capacidade_litros && ["Capacidade", `${c.capacidade_litros}L`],
                c.intervalo_troca_km && ["Troca", `${Number(c.intervalo_troca_km).toLocaleString()} km`],
              ].filter(Boolean) as [string, string][]} />
            ))}

            {/* Fluidos (freio, arrefecimento, direcao) */}
            {fluidos.map((f, i) => {
              const icons: Record<string, string> = { freio: "🔴", arrefecimento: "🌡️", direcao_hidraulica: "🔧" };
              return (
                <CompactSpec key={i} icon={icons[f.tipo] || "💧"} title={String(f.tipo).charAt(0).toUpperCase() + String(f.tipo).slice(1).replace("_", " ")} rows={[
                  (f.fluido || f.especificacao) && ["Tipo", f.especificacao || f.fluido],
                  f.capacidade_litros && ["Capacidade", `${f.capacidade_litros}L`],
                  f.concentracao && ["Proporcao", f.concentracao],
                ].filter(Boolean) as [string, string][]} />
              );
            })}
          </TabsContent>

          {/* FILTROS TAB */}
          <TabsContent value="filtros" className="space-y-3">
            {filtrosCrossref.length === 0 ? (
              <EmptyState text="Dados de filtros nao disponiveis" />
            ) : (
              filtrosCrossref.map((fc, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm capitalize">Filtro de {fc.tipo_filtro}</CardTitle>
                      {fc.oem_codigo && <Badge variant="outline" className="text-[10px] font-mono">OEM {fc.oem_codigo}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                      {filterBrands.map((brand) => {
                        const code = fc[brand];
                        if (!code) return null;
                        return (
                          <div key={brand} className="rounded-lg border border-border/50 bg-secondary/30 p-3 hover:border-primary/30 transition-colors">
                            <div className="h-14 rounded bg-muted/30 border border-dashed border-border/50 flex items-center justify-center mb-2">
                              <span className="text-muted-foreground/30 text-[9px] uppercase">Foto</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{brand}</p>
                            <p className="text-sm font-bold text-primary mt-0.5">{code}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* MARCAS/LUBRIFICANTES TAB */}
          <TabsContent value="lubrificantes" className="space-y-3">
            {specOem && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-1">
                <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Especificacao requerida</p>
                <p className="text-sm font-bold mt-0.5">{specOem.viscosidade} — {specOem.oem_aprovacao}</p>
              </div>
            )}
            {produtos.length === 0 ? (
              <EmptyState text="Produtos nao mapeados para este veiculo" />
            ) : (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {produtos.map((p, i) => (
                  <Card key={i} className="overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group">
                    <div className="h-24 bg-gradient-to-b from-secondary/50 to-card flex items-center justify-center">
                      <div className="w-8 h-14 rounded border border-dashed border-border/40 flex items-center justify-center">
                        <span className="text-muted-foreground/20 text-[7px]">3D</span>
                      </div>
                    </div>
                    <CardContent className="py-2.5">
                      <p className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider">{p.marca}</p>
                      <p className="text-xs font-medium mt-0.5 leading-tight group-hover:text-primary transition-colors line-clamp-2">{p.nome_produto}</p>
                      <Badge variant="outline" className="text-[8px] mt-1.5">{p.viscosidade}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </>
  );
}

function QuickStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 text-center">
      <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-base font-bold text-primary mt-1">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CompactSpec({ icon, title, rows }: { icon: string; title: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground text-xs">{label}</span>
            <span className="font-medium text-xs text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">{text}</CardContent></Card>
  );
}
