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

  // ═══════════════════════════════════════════════
  // PAYWALL — blur-to-reveal + comparacao + trial
  // ═══════════════════════════════════════════════
  if (plano === "free") {
    return (
      <>
        <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8 page-enter">
          <h1 className="text-xl font-bold mb-6">Servicos</h1>

          {/* Outcome headline + Social proof */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold leading-tight">Feche mais servicos com orcamentos profissionais</h2>
            <p className="text-[14px] text-muted-foreground mt-2">
              Envie orcamentos pelo WhatsApp em 30 segundos e aumente seu faturamento.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-3 mt-4">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-7 w-7 rounded-full bg-foreground/10 border-2 border-background"
                    style={{ background: `hsl(${i * 60 + 20}, 40%, ${30 + i * 5}%)` }} />
                ))}
              </div>
              <p className="text-[12px] text-muted-foreground">
                <span className="text-foreground font-semibold">847 oficinas</span> ja usam o Pro
              </p>
            </div>
          </div>

          {/* Blur-to-reveal — preview do orcamento real */}
          <div className="relative rounded-2xl overflow-hidden mb-6">
            {/* Fake orcamento preview */}
            <div className="pointer-events-none select-none p-5 bg-foreground/[0.02]" aria-hidden="true">
              <div className="flex gap-2 mb-4">
                <div className="h-11 flex-1 rounded-xl bg-foreground/5 px-4 flex items-center text-sm text-muted-foreground/40">Joao Silva</div>
                <div className="h-11 flex-1 rounded-xl bg-foreground/5 px-4 flex items-center text-sm text-muted-foreground/40">(11) 99999-9999</div>
              </div>
              <div className="h-12 rounded-xl bg-foreground/5 mb-4 px-4 flex items-center text-sm text-muted-foreground/40">Chevrolet Onix 2024</div>
              <div className="space-y-3">
                {["Oleo motor 5W-30 Dexos1", "Filtro de oleo — Tecfil PSL612", "Filtro de ar — Mann C 23 023", "Mao de obra"].map((item, i) => (
                  <div key={i} className="flex justify-between py-2">
                    <span className="text-[13px] text-muted-foreground/50">{item}</span>
                    <span className="text-[13px] font-medium text-muted-foreground/40">R$ {(30 + i * 25).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-3 mt-2 border-t border-foreground/5">
                <span className="font-semibold text-muted-foreground/40">Total</span>
                <span className="text-lg font-bold text-muted-foreground/40">R$ 185,00</span>
              </div>
              <div className="h-12 rounded-xl bg-[#25D366]/30 mt-3 flex items-center justify-center text-sm font-semibold text-muted-foreground/30">
                Enviar via WhatsApp
              </div>
            </div>

            {/* Blur overlay */}
            <div className="absolute inset-0 backdrop-blur-[6px] bg-gradient-to-t from-background via-background/80 to-background/30" />

            {/* Badge flutuante */}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/20 text-primary text-[11px] font-semibold">
              Pro
            </div>
          </div>

          {/* Feature comparison — Free vs Pro */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Free */}
            <div className="p-4 rounded-2xl bg-foreground/[0.03]">
              <span className="text-[11px] font-semibold text-muted-foreground">Gratis</span>
              <div className="mt-4 space-y-2.5">
                <FeatureRow ok>Consulta de specs</FeatureRow>
                <FeatureRow ok>Assistente IA</FeatureRow>
                <FeatureRow ok>3 veiculos</FeatureRow>
                <FeatureRow>Orcamento WhatsApp</FeatureRow>
                <FeatureRow>Historico</FeatureRow>
                <FeatureRow>Margem de lucro</FeatureRow>
              </div>
            </div>

            {/* Pro */}
            <div className="p-4 rounded-2xl bg-primary/[0.08] border border-primary/20 relative">
              <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                Popular
              </div>
              <span className="text-[11px] font-semibold text-primary">Pro</span>
              <div className="mt-4 space-y-2.5">
                <FeatureRow ok highlight>Tudo do Gratis</FeatureRow>
                <FeatureRow ok highlight>Orcamento WhatsApp</FeatureRow>
                <FeatureRow ok highlight>Historico ilimitado</FeatureRow>
                <FeatureRow ok highlight>Margem de lucro</FeatureRow>
                <FeatureRow ok highlight>Logo da oficina</FeatureRow>
                <FeatureRow ok highlight>Garagem ilimitada</FeatureRow>
              </div>
            </div>
          </div>

          {/* Pricing + CTA */}
          <div className="text-center mb-4">
            <div className="inline-flex items-baseline gap-1">
              <span className="text-3xl font-bold">R$ 1,33</span>
              <span className="text-sm text-muted-foreground">/dia</span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              R$ 39,90/mes · Cancele quando quiser
            </p>
          </div>

          <button className="w-full h-13 py-4 rounded-xl bg-primary text-primary-foreground text-[15px] font-bold shadow-[0_0_20px_var(--primary)/30] hover:shadow-[0_0_30px_var(--primary)/40] transition-all duration-300 pressable">
            Comece 7 dias gratis
          </button>

          <p className="text-center text-[11px] text-muted-foreground/50 mt-3">
            Sem compromisso · Cancele a qualquer momento
          </p>

          {/* Timeline visual — estilo Headspace */}
          <div className="flex items-center justify-between mt-8 px-2">
            <TimelineStep label="Hoje" desc="Acesso total" active />
            <div className="flex-1 h-px bg-foreground/10 mx-2" />
            <TimelineStep label="Dia 5" desc="Lembrete" />
            <div className="flex-1 h-px bg-foreground/10 mx-2" />
            <TimelineStep label="Dia 7" desc="R$ 39,90/mes" />
          </div>
        </div>
        <BottomNav />
      </>
    );
  }

  // ═══════════════════════════════════════════════
  // PRO — Ferramenta de orcamento real
  // ═══════════════════════════════════════════════
  return (
    <>
      <div className="mx-auto max-w-lg px-5 py-6 pb-24 lg:max-w-2xl lg:px-8 lg:pb-8 page-enter">
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
          <div className="animate-stagger">
            {itens.map((it, i) => (
              <div key={i} className="py-4 border-b border-foreground/5 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[14px] font-medium">{it.descricao}</p>
                    {it.marca && <p className="text-[12px] text-muted-foreground">{it.marca} {it.codigo}</p>}
                  </div>
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

            <div className="flex justify-between items-center py-5 mt-2">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
            </div>

            <button onClick={enviar} disabled={!clienteTel || total === 0}
              className="w-full h-12 rounded-xl bg-[#25D366] text-white text-sm font-semibold disabled:opacity-30 flex items-center justify-center gap-2 pressable">
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

function FeatureRow({ children, ok, highlight }: { children: React.ReactNode; ok?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <svg className={`h-4 w-4 shrink-0 ${highlight ? "text-primary" : "text-muted-foreground/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0 text-foreground/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={`text-[13px] ${highlight ? "text-foreground" : ok ? "text-muted-foreground" : "text-foreground/20"}`}>{children}</span>
    </div>
  );
}

function TimelineStep({ label, desc, active }: { label: string; desc: string; active?: boolean }) {
  return (
    <div className="text-center">
      <div className={`h-3 w-3 rounded-full mx-auto mb-1.5 ${active ? "bg-primary" : "bg-foreground/10"}`} />
      <p className={`text-[11px] font-semibold ${active ? "text-foreground" : "text-muted-foreground/50"}`}>{label}</p>
      <p className="text-[10px] text-muted-foreground/40">{desc}</p>
    </div>
  );
}
