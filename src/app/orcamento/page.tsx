"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/BottomNav";

interface Item {
  tipo: string; descricao: string; marca: string; codigo: string;
  quantidade: number; preco_unitario: number;
}

export default function OrcamentoPage() {
  const [plano, setPlano] = useState("free");
  const [veiculos, setVeiculos] = useState<{ id: number; marca: string; modelo: string; ano_de: number }[]>([]);
  const [selVeiculo, setSelVeiculo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTel, setClienteTel] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    const { data: profile } = await supabase.from("profiles").select("plano").eq("id", user.id).single();
    if (profile) setPlano(profile.plano || "free");
    const { data: v } = await supabase.from("veiculos").select("id, marca, modelo, ano_de").order("marca").limit(100);
    if (v) setVeiculos(v);
  }

  async function loadItems(vid: string) {
    setSelVeiculo(vid);
    if (!vid) { setItens([]); return; }
    const id = parseInt(vid);
    const newItems: Item[] = [];
    const { data: oleo } = await supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", id).limit(1);
    if (oleo?.length) {
      newItems.push({ tipo: "oleo", descricao: `Oleo motor ${oleo[0].viscosidade_sae || ""} ${oleo[0].aprovacao_oem || ""}`.trim(), marca: "", codigo: "", quantidade: oleo[0].capacidade_com_filtro_litros || 4, preco_unitario: 0 });
    }
    const { data: filtros } = await supabase.from("filtros_crossref").select("*").eq("veiculo_id", id);
    if (filtros) {
      for (const f of filtros) {
        newItems.push({ tipo: `filtro_${f.tipo_filtro}`, descricao: `Filtro de ${f.tipo_filtro}`, marca: f.tecfil ? "Tecfil" : f.mann ? "Mann" : f.wega ? "Wega" : "", codigo: f.tecfil || f.mann || f.wega || "", quantidade: 1, preco_unitario: 0 });
      }
    }
    newItems.push({ tipo: "mao_obra", descricao: "Mao de obra", marca: "", codigo: "", quantidade: 1, preco_unitario: 0 });
    setItens(newItems);
  }

  function updateItem(i: number, field: keyof Item, value: string | number) {
    setItens((prev) => { const c = [...prev]; (c[i] as unknown as Record<string, string | number>)[field] = value; return c; });
  }

  const total = itens.reduce((s, it) => s + it.quantidade * it.preco_unitario, 0);

  function enviarWhatsApp() {
    const v = veiculos.find((x) => x.id === parseInt(selVeiculo));
    let msg = `*ORCAMENTO - Panther Connect*\n\n*Cliente:* ${clienteNome}\n*Veiculo:* ${v?.marca} ${v?.modelo} ${v?.ano_de}\n\n*Itens:*\n`;
    for (const it of itens) {
      if (it.preco_unitario > 0) {
        msg += `- ${it.descricao}${it.marca ? ` (${it.marca} ${it.codigo})` : ""} — ${it.quantidade}x R$ ${it.preco_unitario.toFixed(2)} = R$ ${(it.quantidade * it.preco_unitario).toFixed(2)}\n`;
      }
    }
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*\n\n_Panther Connect_`;
    window.open(`https://wa.me/55${clienteTel.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // Paywall for free users
  if (plano === "free") {
    return (
      <>
        <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8">
          <h1 className="text-xl font-bold tracking-tight mb-6">Servicos</h1>
          <Card className="border-primary/20">
            <CardContent className="py-10 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              </div>
              <h2 className="text-base font-bold mb-2">Orcamento via WhatsApp</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Crie orcamentos com precos personalizados e envie direto para seus clientes.
              </p>
              <div className="space-y-2 text-left max-w-xs mx-auto mb-6">
                {["Itens pre-preenchidos do veiculo", "Precos customizaveis por item", "Envio direto via WhatsApp", "Historico de orcamentos", "Logo da sua oficina"].map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </div>
                ))}
              </div>
              <Button size="lg">Upgrade para Pro — R$ 39,90/mes</Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 lg:px-8 lg:pb-8">
        <h1 className="text-xl font-bold tracking-tight mb-5">Novo Orcamento</h1>

        <Card className="mb-5">
          <CardContent className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[10px]">Cliente</Label><Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome" /></div>
              <div className="space-y-1"><Label className="text-[10px]">WhatsApp</Label><Input type="tel" value={clienteTel} onChange={(e) => setClienteTel(e.target.value)} placeholder="(11) 99999-9999" /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Veiculo</Label>
              <select value={selVeiculo} onChange={(e) => loadItems(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" aria-label="Selecionar veiculo">
                <option value="">Selecione</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_de || ""}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {itens.length > 0 && (
          <div className="space-y-3 mb-5">
            {itens.map((it, i) => (
              <Card key={i}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium">{it.descricao}</p>
                      {it.marca && <p className="text-[10px] text-muted-foreground">{it.marca} {it.codigo}</p>}
                    </div>
                    <Badge variant="outline" className="text-[9px] capitalize">{it.tipo.replace("_", " ")}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label className="text-[9px]">Qtd</Label><Input type="number" value={it.quantidade} step={0.5} onChange={(e) => updateItem(i, "quantidade", parseFloat(e.target.value) || 0)} /></div>
                    <div><Label className="text-[9px]">R$ Unit.</Label><Input type="number" value={it.preco_unitario || ""} step={0.01} placeholder="0.00" onChange={(e) => updateItem(i, "preco_unitario", parseFloat(e.target.value) || 0)} /></div>
                    <div><Label className="text-[9px]">Subtotal</Label><p className="h-10 flex items-center text-sm font-bold text-primary">R$ {(it.quantidade * it.preco_unitario).toFixed(2)}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Separator />

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4 flex justify-between items-center">
                <span className="text-sm font-bold">TOTAL</span>
                <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
              </CardContent>
            </Card>

            <Button onClick={enviarWhatsApp} disabled={!clienteTel || total === 0} className="w-full" size="lg">
              Enviar via WhatsApp
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
