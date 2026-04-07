"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

interface MeuVeiculo {
  id: number;
  apelido: string | null;
  placa: string | null;
  km_atual: number | null;
  veiculos: { id: number; marca: string; modelo: string; ano_de: number | null; codigo_motor: string | null; };
}

export default function GaragemPage() {
  const [meusVeiculos, setMeusVeiculos] = useState<MeuVeiculo[]>([]);
  const [veiculosAll, setVeiculosAll] = useState<{id: number; marca: string; modelo: string; ano_de: number}[]>([]);
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

    const { data } = await supabase
      .from("meus_veiculos")
      .select("*, veiculos(id, marca, modelo, ano_de, codigo_motor)")
      .eq("user_id", user.id);
    if (data) setMeusVeiculos(data as MeuVeiculo[]);

    const { data: all } = await supabase
      .from("veiculos")
      .select("id, marca, modelo, ano_de")
      .order("marca").order("modelo").limit(100);
    if (all) setVeiculosAll(all);
    setLoading(false);
  }

  async function addVeiculo() {
    if (!selVeiculoId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("meus_veiculos").insert({
      user_id: user.id,
      veiculo_id: parseInt(selVeiculoId),
      apelido: apelido || null,
      placa: placa || null,
      km_atual: km ? parseInt(km) : null,
    });
    setAddMode(false);
    setApelido(""); setPlaca(""); setKm(""); setSelVeiculoId("");
    load();
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando...</div>;

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-white">Minha Garagem</h1>
          <button
            onClick={() => setAddMode(!addMode)}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Adicionar
          </button>
        </div>

        {/* Add vehicle form */}
        {addMode && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 mb-4 space-y-3">
            <select
              value={selVeiculoId}
              onChange={(e) => setSelVeiculoId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">Selecione o veiculo</option>
              {veiculosAll.map((v) => (
                <option key={v.id} value={v.id}>{v.marca} {v.modelo} {v.ano_de || ""}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={apelido} onChange={(e) => setApelido(e.target.value)}
                placeholder="Apelido" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="text" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="Placa" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              <input type="number" value={km} onChange={(e) => setKm(e.target.value)}
                placeholder="KM atual" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <button onClick={addVeiculo} disabled={!selVeiculoId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg py-2 text-sm font-medium">
              Salvar na garagem
            </button>
          </div>
        )}

        {/* Vehicle list */}
        {meusVeiculos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
            <p className="text-lg mb-2">Sua garagem esta vazia</p>
            <p className="text-sm">Adicione seus veiculos para acompanhar manutencoes e receber lembretes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meusVeiculos.map((mv) => (
              <Link key={mv.id} href={`/veiculo/${mv.veiculos.id}`}>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500 transition-colors cursor-pointer mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white capitalize">
                        {mv.veiculos.marca} {mv.veiculos.modelo}
                        {mv.veiculos.ano_de && <span className="text-indigo-400 ml-1">{mv.veiculos.ano_de}</span>}
                      </div>
                      {mv.apelido && <div className="text-xs text-indigo-300 mt-0.5">{mv.apelido}</div>}
                      {mv.veiculos.codigo_motor && <div className="text-xs text-slate-500 mt-0.5">{mv.veiculos.codigo_motor}</div>}
                    </div>
                    <div className="text-right">
                      {mv.placa && <div className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded font-mono">{mv.placa}</div>}
                      {mv.km_atual && <div className="text-xs text-slate-400 mt-1">{mv.km_atual.toLocaleString()} km</div>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
