"use client";

import { useEffect, useState } from "react";
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
}

interface MarcaStats {
  marca: string;
  total_veiculos: number;
  alta: number;
  media: number;
  baixa: number;
}

export default function DashboardPage() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [marcas, setMarcas] = useState<MarcaStats[]>([]);
  const [search, setSearch] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
    loadMarcas();
    loadVeiculos();
  }, []);

  useEffect(() => {
    loadVeiculos();
  }, [search, marcaFilter]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/");
      return;
    }
    setUserEmail(user.email || "");
  }

  async function loadMarcas() {
    const { data } = await supabase.from("cobertura_marcas").select("*");
    if (data) setMarcas(data);
  }

  async function loadVeiculos() {
    setLoading(true);
    let query = supabase
      .from("veiculos")
      .select("id, marca, modelo, ano_de, codigo_motor, confianca, campos_encontrados")
      .order("marca")
      .order("modelo")
      .order("ano_de", { ascending: false });

    if (marcaFilter) {
      query = query.eq("marca", marcaFilter);
    }
    if (search) {
      query = query.or(`marca.ilike.%${search}%,modelo.ilike.%${search}%`);
    }

    const { data } = await query.limit(100);
    setVeiculos(data || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const totalVeiculos = marcas.reduce((s, m) => s + m.total_veiculos, 0);
  const totalAlta = marcas.reduce((s, m) => s + (m.alta || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">Panther Connect</h1>
          <p className="text-xs text-slate-500">{userEmail}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white transition-colors">
          Sair
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{totalVeiculos}</div>
          <div className="text-xs text-slate-500">Veiculos</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{totalAlta}</div>
          <div className="text-xs text-slate-500">Confianca Alta</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
          <div className="text-2xl font-bold text-white">{marcas.length}</div>
          <div className="text-xs text-slate-500">Marcas</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {marcas.reduce((s, m) => s + (m.media || 0), 0)}
          </div>
          <div className="text-xs text-slate-500">Confianca Media</div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar marca ou modelo..."
          className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Brand chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setMarcaFilter("")}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            !marcaFilter ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-700 text-slate-400 hover:border-indigo-500"
          }`}
        >
          Todas
        </button>
        {marcas.map((m) => (
          <button
            key={m.marca}
            onClick={() => setMarcaFilter(m.marca === marcaFilter ? "" : m.marca)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              m.marca === marcaFilter
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-slate-700 text-slate-400 hover:border-indigo-500"
            }`}
          >
            {m.marca} ({m.total_veiculos})
          </button>
        ))}
      </div>

      {/* Vehicle list */}
      {loading ? (
        <div className="text-center text-slate-500 py-12">Carregando...</div>
      ) : veiculos.length === 0 ? (
        <div className="text-center text-slate-500 py-12">Nenhum veiculo encontrado</div>
      ) : (
        <div className="space-y-2">
          {veiculos.map((v) => (
            <Link key={v.id} href={`/veiculo/${v.id}`}>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between hover:border-indigo-500 transition-colors cursor-pointer">
                <div>
                  <span className="font-semibold text-white capitalize">{v.marca}</span>{" "}
                  <span className="text-slate-300 capitalize">{v.modelo}</span>{" "}
                  {v.ano_de && <span className="text-indigo-400 ml-1">{v.ano_de}</span>}
                  {v.codigo_motor && (
                    <span className="text-slate-600 text-xs ml-2">{v.codigo_motor}</span>
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
        </div>
      )}
    </div>
  );
}
