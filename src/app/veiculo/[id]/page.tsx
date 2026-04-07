"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

export default function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [veiculo, setVeiculo] = useState<R | null>(null);
  const [oleo, setOleo] = useState<R[]>([]);
  const [cambio, setCambio] = useState<R[]>([]);
  const [fluidos, setFluidos] = useState<R[]>([]);
  const [filtrosSpecs, setFiltrosSpecs] = useState<R[]>([]);
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
    const [vR, oR, cR, fR, fiR, fcR, vsR] = await Promise.all([
      supabase.from("veiculos").select("*").eq("id", id).single(),
      supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", id),
      supabase.from("specs_cambio").select("*").eq("veiculo_id", id),
      supabase.from("specs_fluidos").select("*").eq("veiculo_id", id),
      supabase.from("specs_filtros").select("*").eq("veiculo_id", id),
      supabase.from("filtros_crossref").select("*").eq("veiculo_id", id),
      supabase.from("veiculo_specs").select("*, specs_oem(*)").eq("veiculo_id", id).eq("sistema", "motor").limit(1),
    ]);

    if (vR.data) setVeiculo(vR.data);
    if (oR.data) setOleo(oR.data);
    if (cR.data) setCambio(cR.data);
    if (fR.data) setFluidos(fR.data);
    if (fiR.data) setFiltrosSpecs(fiR.data);
    if (fcR.data) setFiltrosCrossref(fcR.data);

    if (vsR.data?.[0]) {
      const vs = vsR.data[0];
      if (vs.specs_oem) setSpecOem(vs.specs_oem);
      if (vs.spec_oem_id) {
        const { data: prods } = await supabase.from("produtos_lubrificantes").select("*").eq("spec_oem_id", vs.spec_oem_id).order("destaque", { ascending: false }).order("marca");
        if (prods) setProdutos(prods);
      }
    }
    setLoading(false);
  }

  if (loading) return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <BottomNav />
    </div>
  );

  if (!veiculo) return (
    <div className="flex min-h-screen items-center justify-center text-destructive">Veiculo nao encontrado</div>
  );

  const filterBrands = ["tecfil", "mann", "wega", "fram", "mahle"];

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </Link>

        {/* Vehicle Header */}
        <Card className="mb-5 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-transparent px-5 py-5 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold capitalize lg:text-xl">{veiculo.marca} {veiculo.modelo}</h1>
              {veiculo.ano_de && <span className="text-sm text-primary font-semibold">{veiculo.ano_de}</span>}
            </div>
            <Badge variant={veiculo.confianca === "alta" ? "default" : veiculo.confianca === "media" ? "secondary" : "destructive"}>
              {veiculo.confianca}
            </Badge>
          </div>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
              {veiculo.codigo_motor && <InfoCell label="Motor" value={veiculo.codigo_motor} />}
              {veiculo.cilindrada && <InfoCell label="Cilindrada" value={veiculo.cilindrada} />}
              {veiculo.combustivel && <InfoCell label="Combustivel" value={veiculo.combustivel} />}
              {veiculo.tipo_cambio && <InfoCell label="Cambio" value={veiculo.tipo_cambio} />}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="specs">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="specs" className="flex-1 text-xs">Especificacoes</TabsTrigger>
            <TabsTrigger value="filtros" className="flex-1 text-xs">Filtros {filtrosCrossref.length > 0 && `(${filtrosCrossref.length})`}</TabsTrigger>
            <TabsTrigger value="lubrificantes" className="flex-1 text-xs">Lubrificantes {produtos.length > 0 && `(${produtos.length})`}</TabsTrigger>
          </TabsList>

          {/* SPECS TAB */}
          <TabsContent value="specs" className="space-y-3">
            {oleo.map((o, i) => (
              <SpecCard key={i} title="Oleo Motor" rows={[
                ["Viscosidade SAE", o.viscosidade_sae], ["API", o.categoria_api], ["ACEA", o.categoria_acea],
                ["Aprovacao OEM", o.aprovacao_oem], ["Capacidade", o.capacidade_com_filtro_litros && `${o.capacidade_com_filtro_litros}L`],
                ["Intervalo", o.intervalo_troca_km && `${Number(o.intervalo_troca_km).toLocaleString()} km`],
                ["Intervalo", o.intervalo_troca_meses && `${o.intervalo_troca_meses} meses`], ["Base", o.tipo_base],
              ]} obs={o.observacoes} />
            ))}
            {cambio.map((c, i) => (
              <SpecCard key={i} title={`Cambio ${c.tipo}`} rows={[
                ["Fluido", c.fluido], ["Viscosidade", c.viscosidade], ["Especificacao", c.especificacao],
                ["Capacidade", c.capacidade_litros && `${c.capacidade_litros}L`],
                ["Intervalo", c.intervalo_troca_km && `${Number(c.intervalo_troca_km).toLocaleString()} km`],
              ]} obs={c.observacoes} />
            ))}
            {fluidos.map((f, i) => (
              <SpecCard key={i} title={String(f.tipo).charAt(0).toUpperCase() + String(f.tipo).slice(1)} rows={[
                ["Fluido", f.fluido], ["Especificacao", f.especificacao],
                ["Capacidade", f.capacidade_litros && `${f.capacidade_litros}L`],
                ["Concentracao", f.concentracao],
              ]} obs={f.observacoes} />
            ))}
            {filtrosSpecs.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Filtros</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {filtrosSpecs.map((f, i) => (
                    <div key={i} className="flex justify-between py-2 text-sm">
                      <span className="text-muted-foreground capitalize">{f.tipo}</span>
                      <span className="text-right max-w-[60%]">{f.referencia || "-"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {veiculo.observacoes_tecnicas && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Notas Tecnicas</CardTitle></CardHeader>
                <CardContent><p className="text-xs text-muted-foreground leading-relaxed">{veiculo.observacoes_tecnicas}</p></CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FILTERS TAB */}
          <TabsContent value="filtros" className="space-y-3">
            {filtrosCrossref.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Dados de filtros nao disponiveis para este veiculo</CardContent></Card>
            ) : (
              filtrosCrossref.map((fc, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
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
                            <div className="h-16 rounded bg-muted/30 border border-dashed border-border/50 flex items-center justify-center mb-2">
                              <span className="text-muted-foreground/40 text-[9px] uppercase">Foto</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{brand.replace("_", " ")}</p>
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

          {/* LUBRICANTS TAB */}
          <TabsContent value="lubrificantes" className="space-y-3">
            {specOem && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4">
                  <p className="text-[10px] text-primary font-semibold uppercase tracking-widest mb-1">Especificacao requerida</p>
                  <p className="text-sm font-bold">{specOem.descricao}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {specOem.viscosidade && <Badge variant="outline" className="text-[10px]">SAE {specOem.viscosidade}</Badge>}
                    {specOem.api && <Badge variant="outline" className="text-[10px]">API {specOem.api}</Badge>}
                    {specOem.acea && <Badge variant="outline" className="text-[10px]">ACEA {specOem.acea}</Badge>}
                    {specOem.oem_aprovacao && <Badge variant="outline" className="text-[10px]">{specOem.oem_aprovacao}</Badge>}
                  </div>
                </CardContent>
              </Card>
            )}
            {produtos.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Produtos nao mapeados para este veiculo</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {produtos.map((p, i) => (
                  <Card key={i} className="overflow-hidden hover:border-primary/30 transition-colors cursor-pointer group">
                    <div className="h-32 bg-gradient-to-b from-secondary/50 to-card flex items-center justify-center relative">
                      <div className="w-10 h-16 rounded border border-dashed border-border/50 flex items-center justify-center">
                        <span className="text-muted-foreground/30 text-[7px] uppercase text-center leading-tight">3D</span>
                      </div>
                      {p.destaque && <Badge className="absolute top-2 right-2 text-[8px]">Destaque</Badge>}
                    </div>
                    <CardContent className="py-3">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{p.marca}</p>
                      <p className="text-xs font-semibold mt-0.5 leading-tight group-hover:text-primary transition-colors">{p.nome_produto}</p>
                      <div className="flex gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[9px]">{p.viscosidade}</Badge>
                        <Badge variant="outline" className="text-[9px]">{p.tipo_base}</Badge>
                      </div>
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function SpecCard({ title, rows, obs }: { title: string; rows: [string, string | null | undefined][]; obs?: string }) {
  const validRows = rows.filter(([, v]) => v);
  if (validRows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-0">
        {validRows.map(([label, value], i) => (
          <div key={i} className="flex justify-between items-start py-2 text-sm border-b border-border/30 last:border-0">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-medium text-right ml-4 max-w-[55%]">{value}</span>
          </div>
        ))}
        {obs && (
          <>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground leading-relaxed">{obs}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
