"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SpecRow {
  [key: string]: string | number | null;
}

export default function VeiculoPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [veiculo, setVeiculo] = useState<SpecRow | null>(null);
  const [oleo, setOleo] = useState<SpecRow[]>([]);
  const [cambio, setCambio] = useState<SpecRow[]>([]);
  const [fluidos, setFluidos] = useState<SpecRow[]>([]);
  const [filtros, setFiltros] = useState<SpecRow[]>([]);
  const [diferenciais, setDiferenciais] = useState<SpecRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    checkAuth();
    loadData();
  }, [id]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push("/");
  }

  async function loadData() {
    setLoading(true);

    const [vRes, oRes, cRes, fRes, fiRes, dRes] = await Promise.all([
      supabase.from("veiculos").select("*").eq("id", id).single(),
      supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", id),
      supabase.from("specs_cambio").select("*").eq("veiculo_id", id),
      supabase.from("specs_fluidos").select("*").eq("veiculo_id", id),
      supabase.from("specs_filtros").select("*").eq("veiculo_id", id),
      supabase.from("specs_diferencial").select("*").eq("veiculo_id", id),
    ]);

    if (vRes.data) setVeiculo(vRes.data);
    if (oRes.data) setOleo(oRes.data);
    if (cRes.data) setCambio(cRes.data);
    if (fRes.data) setFluidos(fRes.data);
    if (fiRes.data) setFiltros(fiRes.data);
    if (dRes.data) setDiferenciais(dRes.data);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando...</div>;
  }

  if (!veiculo) {
    return <div className="flex min-h-screen items-center justify-center text-red-400">Veiculo nao encontrado</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/dashboard" className="text-sm text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
        &larr; Voltar
      </Link>

      {/* Vehicle header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white capitalize">
            {veiculo.marca} {veiculo.modelo} {veiculo.ano_de || ""}
          </h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full ${
              veiculo.confianca === "alta"
                ? "bg-emerald-900 text-emerald-300"
                : veiculo.confianca === "media"
                ? "bg-amber-900 text-amber-300"
                : "bg-red-900 text-red-300"
            }`}
          >
            {veiculo.confianca}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {veiculo.codigo_motor && <Info label="Motor" value={String(veiculo.codigo_motor)} />}
          {veiculo.cilindrada && <Info label="Cilindrada" value={String(veiculo.cilindrada)} />}
          {veiculo.combustivel && <Info label="Combustivel" value={String(veiculo.combustivel)} />}
          {veiculo.tipo_cambio && <Info label="Cambio" value={String(veiculo.tipo_cambio)} />}
          {veiculo.metodo_extracao && <Info label="Metodo" value={String(veiculo.metodo_extracao)} />}
          {veiculo.campos_encontrados && <Info label="Campos" value={String(veiculo.campos_encontrados)} />}
        </div>
      </div>

      {/* Oil specs */}
      {oleo.map((o, i) => (
        <SpecCard key={i} title="Oleo Motor" data={o} fields={[
          ["Viscosidade SAE", "viscosidade_sae"],
          ["Categoria API", "categoria_api"],
          ["Categoria ACEA", "categoria_acea"],
          ["Aprovacao OEM", "aprovacao_oem"],
          ["Capacidade (L)", "capacidade_com_filtro_litros"],
          ["Intervalo (km)", "intervalo_troca_km"],
          ["Intervalo (meses)", "intervalo_troca_meses"],
          ["Tipo base", "tipo_base"],
        ]} />
      ))}

      {/* Transmission */}
      {cambio.map((c, i) => (
        <SpecCard key={i} title={`Cambio ${c.tipo || ""}`} data={c} fields={[
          ["Fluido", "fluido"],
          ["Viscosidade", "viscosidade"],
          ["Especificacao", "especificacao"],
          ["Capacidade (L)", "capacidade_litros"],
          ["Intervalo (km)", "intervalo_troca_km"],
        ]} />
      ))}

      {/* Fluids */}
      {fluidos.map((f, i) => (
        <SpecCard key={i} title={`Fluido: ${f.tipo || ""}`} data={f} fields={[
          ["Fluido", "fluido"],
          ["Especificacao", "especificacao"],
          ["Capacidade (L)", "capacidade_litros"],
          ["Concentracao", "concentracao"],
          ["Intervalo (meses)", "intervalo_troca_meses"],
        ]} />
      ))}

      {/* Filters */}
      {filtros.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 mb-4">
          <div className="border-b border-slate-800 px-4 py-3 font-semibold text-sm">Filtros</div>
          <div className="p-4 space-y-2">
            {filtros.map((f, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-slate-400 capitalize">{f.tipo}</span>
                <span className="text-white">
                  {f.referencia || "-"}
                  {f.intervalo_troca_km && ` (${Number(f.intervalo_troca_km).toLocaleString()} km)`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Differentials */}
      {diferenciais.map((d, i) => (
        <SpecCard key={i} title={`Diferencial ${d.posicao || ""}`} data={d} fields={[
          ["Fluido", "fluido"],
          ["Viscosidade", "viscosidade"],
          ["Categoria", "categoria"],
          ["Capacidade (L)", "capacidade_litros"],
        ]} />
      ))}

      {/* Technical notes */}
      {veiculo.observacoes_tecnicas && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 mb-4">
          <div className="border-b border-slate-800 px-4 py-3 font-semibold text-sm">Observacoes Tecnicas</div>
          <div className="p-4 text-sm text-slate-400">{String(veiculo.observacoes_tecnicas)}</div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500 text-xs">{label}</span>
      <br />
      <span className="text-sm">{value}</span>
    </div>
  );
}

function SpecCard({ title, data, fields }: { title: string; data: SpecRow; fields: string[][] }) {
  const rows = fields.filter(([, key]) => data[key] != null);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 mb-4">
      <div className="border-b border-slate-800 px-4 py-3 font-semibold text-sm">{title}</div>
      <div className="p-4 space-y-2">
        {rows.map(([label, key]) => (
          <div key={key} className="flex justify-between text-sm py-1 hover:bg-slate-800/50 px-2 rounded">
            <span className="text-slate-400">{label}</span>
            <span className="text-white font-medium">{String(data[key])}</span>
          </div>
        ))}
        {data.observacoes && (
          <div className="text-xs text-slate-500 mt-2 px-2 border-t border-slate-800 pt-2">
            {String(data.observacoes)}
          </div>
        )}
      </div>
    </div>
  );
}
