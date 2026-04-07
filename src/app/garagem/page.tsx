"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MV = any;

export default function GaragemPage() {
  const [meusVeiculos, setMeusVeiculos] = useState<MV[]>([]);
  const [veiculosAll, setVeiculosAll] = useState<{ id: number; marca: string; modelo: string; ano_de: number }[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [selVeiculoId, setSelVeiculoId] = useState("");
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

  async function addVeiculo() {
    if (!selVeiculoId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("meus_veiculos").insert({ user_id: user.id, veiculo_id: parseInt(selVeiculoId), apelido: apelido || null, placa: placa || null, km_atual: km ? parseInt(km) : null });
    setAddMode(false); setApelido(""); setPlaca(""); setKm(""); setSelVeiculoId("");
    load();
  }

  if (loading) return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <BottomNav />
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold tracking-tight">Minha Garagem</h1>
          <Button size="sm" onClick={() => setAddMode(!addMode)}>{addMode ? "Cancelar" : "+ Adicionar"}</Button>
        </div>

        {addMode && (
          <Card className="mb-5">
            <CardContent className="py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Veiculo</Label>
                <select value={selVeiculoId} onChange={(e) => setSelVeiculoId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" aria-label="Selecionar veiculo">
                  <option value="">Selecione o veiculo</option>
                  {veiculosAll.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_de || ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-[10px]">Apelido</Label><Input value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex: Carro casa" /></div>
                <div className="space-y-1"><Label className="text-[10px]">Placa</Label><Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" className="uppercase font-mono" /></div>
                <div className="space-y-1"><Label className="text-[10px]">KM Atual</Label><Input type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" /></div>
              </div>
              <Button onClick={addVeiculo} disabled={!selVeiculoId} className="w-full">Salvar</Button>
            </CardContent>
          </Card>
        )}

        {meusVeiculos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <div className="text-3xl mb-3 opacity-30">🚗</div>
            <p className="text-sm font-medium text-muted-foreground">Sua garagem esta vazia</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Adicione seus veiculos para acompanhar manutencoes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meusVeiculos.map((mv: MV) => (
              <Link key={mv.id} href={`/veiculo/${mv.veiculos?.id}`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer mb-2">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{mv.veiculos?.marca} {mv.veiculos?.modelo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {mv.veiculos?.ano_de && <span className="text-xs text-primary font-medium">{mv.veiculos.ano_de}</span>}
                        {mv.apelido && <Badge variant="outline" className="text-[10px]">{mv.apelido}</Badge>}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {mv.placa && <Badge variant="secondary" className="font-mono text-[10px]">{mv.placa}</Badge>}
                      {mv.km_atual && <p className="text-[10px] text-muted-foreground">{Number(mv.km_atual).toLocaleString()} km</p>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
