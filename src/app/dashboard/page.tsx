"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Veiculo {
  id: number;
  marca: string;
  modelo: string;
  ano_de: number | null;
  codigo_motor: string | null;
  confianca: string | null;
  campos_encontrados: number | null;
  tipo_cambio: string | null;
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Cascading dropdown state
  const [marcas, setMarcas] = useState<string[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [motores, setMotores] = useState<string[]>([]);

  const [selMarca, setSelMarca] = useState("");
  const [selAno, setSelAno] = useState("");
  const [selModelo, setSelModelo] = useState("");
  const [selMotor, setSelMotor] = useState("");

  // Results
  const [resultados, setResultados] = useState<Veiculo[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stats
  const [totalVeiculos, setTotalVeiculos] = useState(0);
  const [totalMarcas, setTotalMarcas] = useState(0);

  useEffect(() => {
    checkAuth();
    loadMarcas();
    loadStats();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserEmail(user.email || "");
  }

  async function loadStats() {
    const { count } = await supabase.from("veiculos").select("*", { count: "exact", head: true });
    setTotalVeiculos(count || 0);
  }

  // Step 1: Load all brands
  async function loadMarcas() {
    const { data } = await supabase
      .from("veiculos")
      .select("marca")
      .order("marca");
    if (data) {
      const unique = [...new Set(data.map((d) => d.marca))].sort();
      setMarcas(unique);
      setTotalMarcas(unique.length);
    }
  }

  // Step 2: When brand selected, load years
  async function onMarcaChange(marca: string) {
    setSelMarca(marca);
    setSelAno(""); setSelModelo(""); setSelMotor("");
    setAnos([]); setModelos([]); setMotores([]);
    setBuscou(false); setResultados([]);

    if (!marca) return;

    const { data } = await supabase
      .from("veiculos")
      .select("ano_de")
      .eq("marca", marca)
      .order("ano_de", { ascending: false });
    if (data) {
      const unique = [...new Set(data.map((d) => d.ano_de).filter(Boolean))] as number[];
      setAnos(unique);
    }
  }

  // Step 3: When year selected, load models
  async function onAnoChange(ano: string) {
    setSelAno(ano);
    setSelModelo(""); setSelMotor("");
    setModelos([]); setMotores([]);
    setBuscou(false); setResultados([]);

    if (!ano) return;

    const { data } = await supabase
      .from("veiculos")
      .select("modelo")
      .eq("marca", selMarca)
      .eq("ano_de", parseInt(ano))
      .order("modelo");
    if (data) {
      const unique = [...new Set(data.map((d) => d.modelo))].sort();
      setModelos(unique);
      // If only one model, auto-select
      if (unique.length === 1) {
        onModeloChange(unique[0]);
      }
    }
  }

  // Step 4: When model selected, load engines
  async function onModeloChange(modelo: string) {
    setSelModelo(modelo);
    setSelMotor("");
    setMotores([]);
    setBuscou(false); setResultados([]);

    if (!modelo) return;

    const { data } = await supabase
      .from("veiculos")
      .select("codigo_motor")
      .eq("marca", selMarca)
      .eq("ano_de", parseInt(selAno))
      .eq("modelo", modelo);
    if (data) {
      const unique = [...new Set(data.map((d) => d.codigo_motor).filter(Boolean))] as string[];
      setMotores(unique);
    }
  }

  // Step 5: Search
  async function buscar() {
    setLoading(true);
    setBuscou(true);

    let query = supabase
      .from("veiculos")
      .select("*")
      .eq("marca", selMarca);

    if (selAno) query = query.eq("ano_de", parseInt(selAno));
    if (selModelo) query = query.eq("modelo", selModelo);

    const { data } = await query.order("modelo").order("ano_de", { ascending: false });
    setResultados(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const canSearch = selMarca.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">Panther Connect</h1>
          <p className="text-xs text-slate-500">{userEmail}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white">Sair</button>
      </div>

      {/* Stats mini */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
          <div className="text-lg font-bold text-indigo-400">{totalVeiculos}</div>
          <div className="text-[10px] text-slate-500 uppercase">Veiculos</div>
        </div>
        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
          <div className="text-lg font-bold text-white">{totalMarcas}</div>
          <div className="text-[10px] text-slate-500 uppercase">Marcas</div>
        </div>
      </div>

      {/* Guia de Aplicacoes - Cascading Form */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-5 py-4">
          <h2 className="text-base font-bold text-white">Guia de Lubrificantes</h2>
          <p className="text-xs text-indigo-200 mt-0.5">Selecione seu veiculo para ver as especificacoes</p>
        </div>

        <div className="p-5 space-y-3">
          {/* Marca */}
          <SelectField
            label="Marca"
            value={selMarca}
            onChange={onMarcaChange}
            options={marcas}
            placeholder="Selecione a marca"
            enabled={true}
          />

          {/* Ano */}
          <SelectField
            label="Ano de Fabricacao"
            value={selAno}
            onChange={onAnoChange}
            options={anos.map(String)}
            placeholder="Selecione o ano"
            enabled={selMarca.length > 0}
          />

          {/* Modelo */}
          <SelectField
            label="Modelo"
            value={selModelo}
            onChange={onModeloChange}
            options={modelos}
            placeholder="Selecione o modelo"
            enabled={selAno.length > 0}
          />

          {/* Motorizacao */}
          {motores.length > 0 && (
            <SelectField
              label="Motorizacao"
              value={selMotor}
              onChange={setSelMotor}
              options={motores}
              placeholder="Selecione a motorizacao"
              enabled={selModelo.length > 0}
            />
          )}

          {/* Buscar */}
          <button
            onClick={buscar}
            disabled={!canSearch || loading}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 text-sm transition-colors mt-2"
          >
            {loading ? "Buscando..." : "BUSCAR"}
          </button>
        </div>
      </div>

      {/* Results */}
      {buscou && (
        <div className="space-y-3">
          {resultados.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-500">
              Nenhum veiculo encontrado para esta combinacao
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 mb-2">
                {resultados.length} resultado{resultados.length > 1 ? "s" : ""} encontrado{resultados.length > 1 ? "s" : ""}
              </p>
              {resultados.map((v) => (
                <Link key={v.id} href={`/veiculo/${v.id}`}>
                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between hover:border-indigo-500 transition-colors cursor-pointer mb-2">
                    <div>
                      <span className="font-semibold text-white capitalize">{v.marca}</span>{" "}
                      <span className="text-slate-300 capitalize">{v.modelo}</span>{" "}
                      {v.ano_de && <span className="text-indigo-400 ml-1">{v.ano_de}</span>}
                      {v.codigo_motor && (
                        <div className="text-slate-500 text-xs mt-0.5">{v.codigo_motor}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{v.campos_encontrados || 0} campos</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          v.confianca === "alta"
                            ? "bg-emerald-900 text-emerald-300"
                            : v.confianca === "media"
                            ? "bg-amber-900 text-amber-300"
                            : "bg-red-900 text-red-300"
                        }`}
                      >
                        {v.confianca}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  enabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  enabled: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!enabled}
          className={`w-full appearance-none rounded-lg border px-4 py-3 text-sm pr-10 transition-colors ${
            enabled
              ? "border-slate-700 bg-slate-800 text-white hover:border-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              : "border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt} className="capitalize">
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
