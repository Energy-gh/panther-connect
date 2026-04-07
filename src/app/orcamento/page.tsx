"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;

interface Item { tipo: string; descricao: string; marca: string; codigo: string; quantidade: number; preco_unitario: number; }

export default function OrcamentoPage() {
  const [plano, setPlano] = useState("free");
  const [veiculos, setVeiculos] = useState<A[]>([]);
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
    const { data: p } = await supabase.from("profiles").select("plano").eq("id", user.id).single();
    if (p) setPlano(p.plano || "free");
    const { data: v } = await supabase.from("veiculos").select("id, marca, modelo, ano_de").order("marca").limit(100);
    if (v) setVeiculos(v);
  }

  async function loadItems(vid: string) {
    setSelVeiculo(vid);
    if (!vid) { setItens([]); return; }
    const id = parseInt(vid);
    const items: Item[] = [];
    const { data: oleo } = await supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", id).limit(1);
    if (oleo?.length) items.push({ tipo: "oleo", descricao: `Oleo motor ${oleo[0].viscosidade_sae || ""} ${oleo[0].aprovacao_oem || ""}`.trim(), marca: "", codigo: "", quantidade: oleo[0].capacidade_com_filtro_litros || 4, preco_unitario: 0 });
    const { data: f } = await supabase.from("filtros_crossref").select("*").eq("veiculo_id", id);
    if (f) for (const x of f) items.push({ tipo: `filtro_${x.tipo_filtro}`, descricao: `Filtro de ${x.tipo_filtro}`, marca: x.tecfil ? "Tecfil" : x.mann ? "Mann" : "", codigo: x.tecfil || x.mann || x.wega || "", quantidade: 1, preco_unitario: 0 });
    items.push({ tipo: "mao_obra", descricao: "Mao de obra", marca: "", codigo: "", quantidade: 1, preco_unitario: 0 });
    setItens(items);
  }

  function update(i: number, field: keyof Item, val: string | number) {
    setItens((p) => { const c = [...p]; (c[i] as unknown as Record<string, string | number>)[field] = val; return c; });
  }

  const total = itens.reduce((s, it) => s + it.quantidade * it.preco_unitario, 0);

  function enviar() {
    const v = veiculos.find((x: A) => x.id === parseInt(selVeiculo));
    let msg = `*ORCAMENTO*\n\n*Cliente:* ${clienteNome}\n*Veiculo:* ${v?.marca} ${v?.modelo} ${v?.ano_de}\n\n`;
    for (const it of itens) if (it.preco_unitario > 0) msg += `${it.descricao}${it.marca ? ` (${it.marca} ${it.codigo})` : ""} — ${it.quantidade}x R$ ${it.preco_unitario.toFixed(2)} = R$ ${(it.quantidade * it.preco_unitario).toFixed(2)}\n`;
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*\n\n_Panther Connect_`;
    window.open(`https://wa.me/55${clienteTel.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (plano === "free") {
    return (
      <>
        <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8">
          <h1 className="text-xl font-bold mb-8">Servicos</h1>
          <div className="text-center py-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5 mb-5">
              <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Orcamento via WhatsApp</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">
              Crie orcamentos e envie direto para seus clientes pelo WhatsApp.
            </p>
            <button className="h-12 px-8 rounded-xl bg-foreground text-background text-sm font-semibold">
              Upgrade para Pro — R$ 39,90/mes
            </button>
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8 lg:pb-8">
        <h1 className="text-xl font-bold mb-5">Novo Orcamento</h1>

        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome do cliente" className="h-11 rounded-xl bg-foreground/5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10" />
            <input type="tel" value={clienteTel} onChange={(e) => setClienteTel(e.target.value)} placeholder="WhatsApp" className="h-11 rounded-xl bg-foreground/5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10" />
          </div>
          <select value={selVeiculo} onChange={(e) => loadItems(e.target.value)}
            className="w-full h-12 appearance-none rounded-xl bg-foreground/5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10" aria-label="Veiculo">
            <option value="">Selecione o veiculo</option>
            {veiculos.map((v: A) => <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_de || ""}</option>)}
          </select>
        </div>

        {itens.length > 0 && (
          <div>
            <div className="divide-y divide-foreground/5">
              {itens.map((it, i) => (
                <div key={i} className="py-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[14px] font-medium">{it.descricao}</p>
                      {it.marca && <p className="text-[12px] text-muted-foreground">{it.marca} {it.codigo}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 capitalize">{it.tipo.replace("_", " ")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground">Qtd</span>
                      <input type="number" value={it.quantidade} step={0.5} onChange={(e) => update(i, "quantidade", parseFloat(e.target.value) || 0)}
                        className="w-full h-10 rounded-lg bg-foreground/5 px-3 text-sm mt-1 focus:outline-none" />
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">R$ Unit.</span>
                      <input type="number" value={it.preco_unitario || ""} step={0.01} placeholder="0.00" onChange={(e) => update(i, "preco_unitario", parseFloat(e.target.value) || 0)}
                        className="w-full h-10 rounded-lg bg-foreground/5 px-3 text-sm mt-1 focus:outline-none" />
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">Subtotal</span>
                      <p className="h-10 flex items-center text-sm font-semibold text-primary mt-1">R$ {(it.quantidade * it.preco_unitario).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center py-5 mt-2">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
            </div>

            <button onClick={enviar} disabled={!clienteTel || total === 0}
              className="w-full h-12 rounded-xl bg-[#25D366] text-white text-sm font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.489l4.615-1.466A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.308-.734-5.982-1.975l-.422-.309-2.737.87.908-2.637-.34-.452A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              Enviar via WhatsApp
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
