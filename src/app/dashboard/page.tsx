"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Veiculo {
  id: number;
  marca: string;
  modelo: string;
  ano_de: number | null;
  codigo_motor: string | null;
  confianca: string | null;
  campos_encontrados: number | null;
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Search state
  const [marcas, setMarcas] = useState<string[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [motores, setMotores] = useState<string[]>([]);
  const [selMarca, setSelMarca] = useState("");
  const [selAno, setSelAno] = useState("");
  const [selModelo, setSelModelo] = useState("");
  const [selMotor, setSelMotor] = useState("");
  const [resultados, setResultados] = useState<Veiculo[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Plate search
  const [placaInput, setPlacaInput] = useState("");
  const [placaLoading, setPlacaLoading] = useState(false);
  const [placaResult, setPlacaResult] = useState<string | null>(null);

  // Stats
  const [totalVeiculos, setTotalVeiculos] = useState(0);
  const [totalMarcas, setTotalMarcas] = useState(0);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selMarca) loadAnos();
  }, [selMarca]);

  useEffect(() => {
    if (selAno) loadModelos();
  }, [selAno]);

  useEffect(() => {
    if (selModelo) loadMotores();
  }, [selModelo]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserEmail(user.email || "");

    const [{ data: marcasData }, { count }] = await Promise.all([
      supabase.from("veiculos").select("marca").order("marca"),
      supabase.from("veiculos").select("*", { count: "exact", head: true }),
    ]);

    if (marcasData) {
      const unique = [...new Set(marcasData.map((d) => d.marca))].sort();
      setMarcas(unique);
      setTotalMarcas(unique.length);
    }
    setTotalVeiculos(count || 0);
    setPageLoading(false);
  }

  async function loadAnos() {
    setSelAno(""); setSelModelo(""); setSelMotor("");
    setAnos([]); setModelos([]); setMotores([]);
    setBuscou(false);
    const { data } = await supabase.from("veiculos").select("ano_de").eq("marca", selMarca).order("ano_de", { ascending: false });
    if (data) setAnos([...new Set(data.map((d) => d.ano_de).filter(Boolean))] as number[]);
  }

  async function loadModelos() {
    setSelModelo(""); setSelMotor(""); setModelos([]); setMotores([]);
    setBuscou(false);
    const { data } = await supabase.from("veiculos").select("modelo").eq("marca", selMarca).eq("ano_de", parseInt(selAno)).order("modelo");
    if (data) {
      const unique = [...new Set(data.map((d) => d.modelo))].sort();
      setModelos(unique);
      if (unique.length === 1) { setSelModelo(unique[0]); }
    }
  }

  async function loadMotores() {
    setSelMotor(""); setMotores([]);
    setBuscou(false);
    const { data } = await supabase.from("veiculos").select("codigo_motor").eq("marca", selMarca).eq("ano_de", parseInt(selAno)).eq("modelo", selModelo);
    if (data) setMotores([...new Set(data.map((d) => d.codigo_motor).filter(Boolean))] as string[]);
  }

  async function buscar() {
    setLoading(true); setBuscou(true);
    let query = supabase.from("veiculos").select("*").eq("marca", selMarca);
    if (selAno) query = query.eq("ano_de", parseInt(selAno));
    if (selModelo) query = query.eq("modelo", selModelo);
    const { data } = await query.order("modelo").order("ano_de", { ascending: false });
    // Se encontrou exatamente 1 resultado, vai direto
    if (data && data.length === 1) {
      router.push(`/veiculo/${data[0].id}`);
      return;
    }
    setResultados(data || []);
    setLoading(false);
  }

  async function searchPlaca() {
    if (placaInput.length < 7) return;
    setPlacaLoading(true); setPlacaResult(null);
    try {
      const res = await fetch("/api/placa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaInput }),
      });
      const data = await res.json();
      if (data.veiculo_id) { router.push(`/veiculo/${data.veiculo_id}`); }
      else { setPlacaResult(data.error || "Veiculo nao encontrado. Use a busca manual."); }
    } catch { setPlacaResult("Erro na consulta."); }
    setPlacaLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (pageLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Panther Connect</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          Sair
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalVeiculos}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Veiculos</p>
        </CardContent></Card>
        <Card><CardContent className="py-4 text-center">
          <p className="text-2xl font-bold">{totalMarcas}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Marcas</p>
        </CardContent></Card>
      </div>

      {/* Plate Search */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex gap-2">
            <Input
              value={placaInput}
              onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
              maxLength={7}
              placeholder="Buscar por placa (ABC1D23)"
              className="font-mono tracking-widest uppercase"
              onKeyDown={(e) => e.key === "Enter" && searchPlaca()}
            />
            <Button onClick={searchPlaca} disabled={placaInput.length < 7 || placaLoading} className="shrink-0">
              {placaLoading ? "..." : "Buscar"}
            </Button>
          </div>
          {placaResult && <p className="text-xs text-destructive mt-2">{placaResult}</p>}
        </CardContent>
      </Card>

      {/* Stories Patrocinados */}
      <div className="mb-6 -mx-4 lg:mx-0">
        <div className="flex items-center justify-between px-4 lg:px-0 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ofertas</h2>
          <Badge variant="outline" className="text-[9px]">Patrocinado</Badge>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-x px-4 lg:px-0 pb-2 scrollbar-none">
          {[
            { brand: "Shell", product: "Helix Ultra 5W-30", color: "from-red-950/40 to-card" },
            { brand: "Mobil", product: "Super 3000 5W-30", color: "from-blue-950/40 to-card" },
            { brand: "Castrol", product: "Magnatec 5W-30", color: "from-green-950/40 to-card" },
            { brand: "Petronas", product: "Syntium 3000 5W-30", color: "from-teal-950/40 to-card" },
          ].map((story) => (
            <div key={story.brand} className="snap-start shrink-0 w-36 lg:w-44">
              <div className={`rounded-xl border border-border/50 bg-gradient-to-b ${story.color} p-4 aspect-[3/4] flex flex-col justify-end cursor-pointer hover:border-primary/30 transition-colors`}>
                <div className="mt-auto">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{story.brand}</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5 leading-tight">{story.product}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guia de Lubrificantes */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 to-transparent px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-bold">Guia de Lubrificantes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Selecione seu veiculo</p>
        </div>
        <CardContent className="py-5 space-y-4">
          <FormSelect label="Marca" value={selMarca} onChange={setSelMarca} options={marcas} placeholder="Selecione a marca" />
          <FormSelect label="Ano" value={selAno} onChange={setSelAno} options={anos.map(String)} placeholder="Selecione o ano" disabled={!selMarca} />
          <FormSelect label="Modelo" value={selModelo} onChange={setSelModelo} options={modelos} placeholder="Selecione o modelo" disabled={!selAno} />
          {motores.length > 0 && (
            <FormSelect label="Motorizacao" value={selMotor} onChange={setSelMotor} options={motores} placeholder="Selecione (opcional)" disabled={!selModelo} />
          )}
          <Button onClick={buscar} disabled={!selMarca || loading} className="w-full" size="lg">
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {buscou && (
        <div className="space-y-2">
          {resultados.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Nenhum veiculo encontrado
            </CardContent></Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">{resultados.length} resultado{resultados.length > 1 ? "s" : ""}</p>
              {resultados.map((v) => (
                <Link key={v.id} href={`/veiculo/${v.id}`}>
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer mb-2">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold capitalize">{v.marca} <span className="text-muted-foreground font-normal">{v.modelo}</span></p>
                        <div className="flex items-center gap-2 mt-1">
                          {v.ano_de && <span className="text-xs text-primary font-medium">{v.ano_de}</span>}
                          {v.codigo_motor && <span className="text-xs text-muted-foreground">{v.codigo_motor}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{v.campos_encontrados} campos</span>
                        <Badge variant={v.confianca === "alta" ? "default" : v.confianca === "media" ? "secondary" : "destructive"} className="text-[10px]">
                          {v.confianca}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FormSelect({ label, value, onChange, options, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex h-11 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-8"
          aria-label={label}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
