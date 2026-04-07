"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface R { [key: string]: string | number | boolean | null; }

export default function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const [veiculo, setVeiculo] = useState<R | null>(null);
  const [oleo, setOleo] = useState<R[]>([]);
  const [cambio, setCambio] = useState<R[]>([]);
  const [fluidos, setFluidos] = useState<R[]>([]);
  const [filtrosSpecs, setFiltrosSpecs] = useState<R[]>([]);
  const [diferenciais, setDiferenciais] = useState<R[]>([]);
  const [filtrosCrossref, setFiltrosCrossref] = useState<R[]>([]);
  const [produtos, setProdutos] = useState<R[]>([]);
  const [specOem, setSpecOem] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"specs" | "filtros" | "lubrificantes">("specs");
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
    const [vR, oR, cR, fR, fiR, dR, fcR, vsR] = await Promise.all([
      supabase.from("veiculos").select("*").eq("id", id).single(),
      supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", id),
      supabase.from("specs_cambio").select("*").eq("veiculo_id", id),
      supabase.from("specs_fluidos").select("*").eq("veiculo_id", id),
      supabase.from("specs_filtros").select("*").eq("veiculo_id", id),
      supabase.from("specs_diferencial").select("*").eq("veiculo_id", id),
      supabase.from("filtros_crossref").select("*").eq("veiculo_id", id),
      supabase.from("veiculo_specs").select("*, specs_oem(*)").eq("veiculo_id", id).eq("sistema", "motor").limit(1),
    ]);

    if (vR.data) setVeiculo(vR.data);
    if (oR.data) setOleo(oR.data);
    if (cR.data) setCambio(cR.data);
    if (fR.data) setFluidos(fR.data);
    if (fiR.data) setFiltrosSpecs(fiR.data);
    if (dR.data) setDiferenciais(dR.data);
    if (fcR.data) setFiltrosCrossref(fcR.data);

    // Load lubricant products for this vehicle's spec
    if (vsR.data && vsR.data.length > 0) {
      const vs = vsR.data[0] as R & { specs_oem?: R };
      if (vs.specs_oem) setSpecOem(vs.specs_oem);
      const specId = vs.spec_oem_id;
      if (specId) {
        const { data: prods } = await supabase
          .from("produtos_lubrificantes")
          .select("*")
          .eq("spec_oem_id", specId)
          .order("destaque", { ascending: false })
          .order("marca");
        if (prods) setProdutos(prods);
      }
    }
    setLoading(false);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando...</div>;
  if (!veiculo) return <div className="flex min-h-screen items-center justify-center text-red-400">Veiculo nao encontrado</div>;

  const marcasFiltro = ["tecfil", "mann", "wega", "fram", "mahle", "filtros_brasil"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300 mb-4 inline-block">&larr; Voltar</Link>

      {/* Vehicle header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white capitalize">
            {veiculo.marca} {veiculo.modelo} {veiculo.ano_de || ""}
          </h1>
          <span className={`text-xs px-2.5 py-1 rounded-full ${
            veiculo.confianca === "alta" ? "bg-emerald-900 text-emerald-300"
            : veiculo.confianca === "media" ? "bg-amber-900 text-amber-300"
            : "bg-red-900 text-red-300"
          }`}>{veiculo.confianca}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {veiculo.codigo_motor && <Info label="Motor" value={String(veiculo.codigo_motor)} />}
          {veiculo.cilindrada && <Info label="Cilindrada" value={String(veiculo.cilindrada)} />}
          {veiculo.combustivel && <Info label="Combustivel" value={String(veiculo.combustivel)} />}
          {veiculo.tipo_cambio && <Info label="Cambio" value={String(veiculo.tipo_cambio)} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900 rounded-xl p-1">
        {[
          { key: "specs" as const, label: "Especificacoes" },
          { key: "filtros" as const, label: "Filtros", count: filtrosCrossref.length },
          { key: "lubrificantes" as const, label: "Lubrificantes", count: produtos.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === t.key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label} {t.count ? `(${t.count})` : ""}
          </button>
        ))}
      </div>

      {/* TAB: Especificacoes */}
      {tab === "specs" && (
        <div className="space-y-3">
          {oleo.map((o, i) => (
            <SpecCard key={i} title="Oleo Motor" data={o} fields={[
              ["Viscosidade SAE", "viscosidade_sae"], ["Categoria API", "categoria_api"],
              ["ACEA", "categoria_acea"], ["Aprovacao OEM", "aprovacao_oem"],
              ["Capacidade (L)", "capacidade_com_filtro_litros"],
              ["Intervalo (km)", "intervalo_troca_km"], ["Intervalo (meses)", "intervalo_troca_meses"],
              ["Tipo base", "tipo_base"],
            ]} />
          ))}
          {cambio.map((c, i) => (
            <SpecCard key={i} title={`Cambio ${c.tipo || ""}`} data={c} fields={[
              ["Fluido", "fluido"], ["Viscosidade", "viscosidade"], ["Especificacao", "especificacao"],
              ["Capacidade (L)", "capacidade_litros"], ["Intervalo (km)", "intervalo_troca_km"],
            ]} />
          ))}
          {fluidos.map((f, i) => (
            <SpecCard key={i} title={`${f.tipo || ""}`} data={f} fields={[
              ["Fluido", "fluido"], ["Especificacao", "especificacao"],
              ["Capacidade (L)", "capacidade_litros"], ["Concentracao", "concentracao"],
            ]} icon={f.tipo === "freio" ? "brake" : f.tipo === "arrefecimento" ? "coolant" : "steering"} />
          ))}
          {filtrosSpecs.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-4 py-3 font-semibold text-sm">Filtros</div>
              <div className="p-3 space-y-1">
                {filtrosSpecs.map((f, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 px-2">
                    <span className="text-slate-400 capitalize">{f.tipo}</span>
                    <span className="text-white text-right max-w-[60%]">
                      {f.referencia || "-"}
                      {f.intervalo_troca_km && ` (${Number(f.intervalo_troca_km).toLocaleString()} km)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {veiculo.observacoes_tecnicas && (
            <div className="rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-4 py-3 font-semibold text-sm">Notas Tecnicas</div>
              <div className="p-3 text-xs text-slate-400 leading-relaxed">{String(veiculo.observacoes_tecnicas)}</div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Filtros Cross-Reference */}
      {tab === "filtros" && (
        <div className="space-y-3">
          {filtrosCrossref.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
              Dados de filtros ainda nao disponiveis para este veiculo
            </div>
          ) : (
            filtrosCrossref.map((fc, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="border-b border-slate-800 px-4 py-3 flex justify-between items-center">
                  <span className="font-semibold text-sm capitalize">Filtro de {fc.tipo_filtro}</span>
                  {fc.oem_codigo && <span className="text-xs text-slate-500">OEM: {fc.oem_codigo}</span>}
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {marcasFiltro.map((marca) => {
                    const code = fc[marca];
                    if (!code) return null;
                    return (
                      <div key={marca} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:border-indigo-500 transition-colors cursor-pointer">
                        {/* Espaco para imagem/3D do filtro */}
                        <div className="w-full h-20 rounded-lg bg-slate-700/30 border border-dashed border-slate-600 flex items-center justify-center mb-2">
                          <span className="text-slate-600 text-[10px] uppercase">Foto {marca}</span>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 uppercase font-medium">{marca.replace("_", " ")}</div>
                          <div className="text-sm font-bold text-indigo-400">{String(code)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: Lubrificantes por marca */}
      {tab === "lubrificantes" && (
        <div className="space-y-3">
          {/* Spec OEM header */}
          {specOem && (
            <div className="rounded-xl border border-indigo-800/50 bg-indigo-950/30 p-4 mb-2">
              <div className="text-xs text-indigo-400 font-semibold uppercase mb-1">Especificacao requerida</div>
              <div className="text-white font-bold">{specOem.descricao}</div>
              <div className="flex gap-3 mt-2 text-xs text-slate-400">
                <span>SAE {specOem.viscosidade}</span>
                {specOem.api && <span>API {specOem.api}</span>}
                {specOem.acea && <span>ACEA {specOem.acea}</span>}
                {specOem.oem_aprovacao && <span>{specOem.oem_aprovacao}</span>}
              </div>
            </div>
          )}

          {produtos.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
              Produtos lubrificantes ainda nao mapeados para este veiculo
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {produtos.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-indigo-500 transition-colors cursor-pointer group">
                  {/* Espaco para foto/3D do frasco */}
                  <div className="w-full h-36 bg-gradient-to-b from-slate-800/50 to-slate-900 border-b border-slate-800 flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="w-12 h-20 rounded bg-slate-700/50 border border-dashed border-slate-600 mx-auto mb-1 flex items-center justify-center">
                        <span className="text-slate-600 text-[8px] uppercase leading-tight text-center">3D<br/>Frasco</span>
                      </div>
                      <span className="text-[9px] text-slate-600">Imagem em breve</span>
                    </div>
                    {p.destaque && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-[8px] font-bold text-black px-1.5 py-0.5 rounded">
                        DESTAQUE
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">{p.marca}</div>
                    <div className="text-sm font-medium text-white mt-0.5 leading-tight group-hover:text-indigo-400 transition-colors">
                      {p.nome_produto}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{p.viscosidade}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{p.tipo_base}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500 text-[10px] uppercase">{label}</span>
      <br /><span className="text-sm">{value}</span>
    </div>
  );
}

function SpecCard({ title, data, fields, icon }: { title: string; data: R; fields: string[][]; icon?: string }) {
  const rows = fields.filter(([, key]) => data[key] != null);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3 font-semibold text-sm capitalize">{title}</div>
      <div className="p-3 space-y-1">
        {rows.map(([label, key]) => (
          <div key={key} className="flex justify-between text-sm py-1.5 px-2 hover:bg-slate-800/50 rounded">
            <span className="text-slate-400">{label}</span>
            <span className="text-white font-medium text-right max-w-[55%]">{String(data[key])}</span>
          </div>
        ))}
        {data.observacoes && (
          <div className="text-xs text-slate-500 mt-2 px-2 border-t border-slate-800 pt-2">{String(data.observacoes)}</div>
        )}
      </div>
    </div>
  );
}
