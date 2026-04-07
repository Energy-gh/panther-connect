"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

interface Item {
  tipo: string;
  descricao: string;
  marca: string;
  codigo: string;
  quantidade: number;
  preco_unitario: number;
}

export default function OrcamentoPage() {
  const [plano, setPlano] = useState("free");
  const [veiculos, setVeiculos] = useState<{id: number; marca: string; modelo: string; ano_de: number}[]>([]);
  const [selVeiculo, setSelVeiculo] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTel, setClienteTel] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plano")
      .eq("id", user.id)
      .single();
    if (profile) setPlano(profile.plano || "free");

    const { data: v } = await supabase
      .from("veiculos")
      .select("id, marca, modelo, ano_de")
      .order("marca").limit(100);
    if (v) setVeiculos(v);
  }

  async function loadVehicleItems(veiculoId: string) {
    setSelVeiculo(veiculoId);
    if (!veiculoId) { setItens([]); return; }

    const vid = parseInt(veiculoId);
    const newItems: Item[] = [];

    // Load oil specs
    const { data: oleo } = await supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", vid).limit(1);
    if (oleo?.length) {
      newItems.push({
        tipo: "oleo",
        descricao: `Oleo motor ${oleo[0].viscosidade_sae || ""} ${oleo[0].aprovacao_oem || ""}`.trim(),
        marca: "", codigo: "",
        quantidade: oleo[0].capacidade_com_filtro_litros || 4,
        preco_unitario: 0,
      });
    }

    // Load filters
    const { data: filtros } = await supabase.from("filtros_crossref").select("*").eq("veiculo_id", vid);
    if (filtros) {
      for (const f of filtros) {
        newItems.push({
          tipo: `filtro_${f.tipo_filtro}`,
          descricao: `Filtro de ${f.tipo_filtro}`,
          marca: f.tecfil ? "Tecfil" : f.mann ? "Mann" : f.wega ? "Wega" : "",
          codigo: f.tecfil || f.mann || f.wega || "",
          quantidade: 1,
          preco_unitario: 0,
        });
      }
    }

    // Add labor
    newItems.push({
      tipo: "mao_obra",
      descricao: "Mao de obra - troca de oleo e filtros",
      marca: "", codigo: "",
      quantidade: 1,
      preco_unitario: 0,
    });

    setItens(newItems);
  }

  function updateItem(index: number, field: keyof Item, value: string | number) {
    setItens((prev) => {
      const copy = [...prev];
      (copy[index] as unknown as Record<string, string | number>)[field] = value;
      return copy;
    });
  }

  function total() {
    return itens.reduce((sum, item) => sum + item.quantidade * item.preco_unitario, 0);
  }

  function gerarWhatsApp() {
    const veiculo = veiculos.find((v) => v.id === parseInt(selVeiculo));
    let msg = `*ORCAMENTO - Panther Connect*\n\n`;
    msg += `*Cliente:* ${clienteNome}\n`;
    msg += `*Veiculo:* ${veiculo?.marca} ${veiculo?.modelo} ${veiculo?.ano_de}\n\n`;
    msg += `*Itens:*\n`;
    for (const item of itens) {
      if (item.preco_unitario > 0) {
        msg += `- ${item.descricao}`;
        if (item.marca) msg += ` (${item.marca} ${item.codigo})`;
        msg += ` - ${item.quantidade}x R$ ${item.preco_unitario.toFixed(2)}`;
        msg += ` = R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}\n`;
      }
    }
    msg += `\n*TOTAL: R$ ${total().toFixed(2)}*\n`;
    msg += `\n_Orcamento gerado pelo Panther Connect_`;

    const tel = clienteTel.replace(/\D/g, "");
    const url = `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  if (plano === "free") {
    return (
      <>
        <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
          <h1 className="text-xl font-bold text-white mb-6">Orcamento WhatsApp</h1>
          <div className="rounded-2xl border border-indigo-800/50 bg-gradient-to-b from-indigo-950/30 to-slate-950 p-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-bold text-white mb-2">Recurso Profissional</h2>
            <p className="text-sm text-slate-400 mb-4">
              Crie orcamentos completos com precos personalizados e envie direto pelo WhatsApp para seus clientes.
            </p>
            <div className="space-y-2 text-left max-w-xs mx-auto mb-6">
              {["Itens pre-preenchidos do veiculo", "Precos customizaveis", "Envio direto via WhatsApp", "Historico de orcamentos", "Logo da sua oficina"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400">✓</span> {f}
                </div>
              ))}
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
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
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <h1 className="text-xl font-bold text-white mb-4">Novo Orcamento</h1>

        {/* Client info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)}
              placeholder="Nome do cliente" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input type="tel" value={clienteTel} onChange={(e) => setClienteTel(e.target.value)}
              placeholder="WhatsApp (DDD + numero)" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <select value={selVeiculo} onChange={(e) => loadVehicleItems(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Selecione o veiculo do cliente</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_de || ""}</option>
            ))}
          </select>
        </div>

        {/* Items */}
        {itens.length > 0 && (
          <div className="space-y-2 mb-4">
            {itens.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-medium text-white">{item.descricao}</div>
                    {item.marca && <div className="text-xs text-slate-500">{item.marca} {item.codigo}</div>}
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded capitalize">{item.tipo.replace("_", " ")}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Qtd</label>
                    <input type="number" value={item.quantidade} step="0.5"
                      onChange={(e) => updateItem(i, "quantidade", parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Preco Unit. (R$)</label>
                    <input type="number" value={item.preco_unitario || ""} step="0.01"
                      onChange={(e) => updateItem(i, "preco_unitario", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Subtotal</label>
                    <div className="text-sm font-bold text-emerald-400 py-1.5">
                      R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4 flex justify-between items-center">
              <span className="text-sm font-semibold text-white">TOTAL</span>
              <span className="text-xl font-bold text-emerald-400">R$ {total().toFixed(2)}</span>
            </div>

            {/* Send via WhatsApp */}
            <button
              onClick={gerarWhatsApp}
              disabled={!clienteTel || total() === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.489l4.615-1.466A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.239 0-4.308-.734-5.982-1.975l-.422-.309-2.737.87.908-2.637-.34-.452A9.957 9.957 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              Enviar Orcamento via WhatsApp
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
