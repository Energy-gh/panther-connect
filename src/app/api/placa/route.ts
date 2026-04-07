import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { placa } = await req.json();

  if (!placa || placa.length < 7) {
    return NextResponse.json({ error: "Placa invalida" }, { status: 400 });
  }

  const placaClean = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // 1. Check cache first
  const { data: cached } = await supabase
    .from("cache_placas")
    .select("*")
    .eq("placa", placaClean)
    .single();

  if (cached) {
    return NextResponse.json({
      source: "cache",
      placa: cached.placa,
      marca: cached.marca,
      modelo: cached.modelo,
      ano: cached.ano,
      cor: cached.cor,
      combustivel: cached.combustivel,
      veiculo_id: cached.veiculo_id,
    });
  }

  // 2. Call APIBrasil (or mock for now)
  try {
    // APIBrasil free endpoint
    const apiResp = await fetch(
      `https://brasilapi.com.br/api/fipe/preco/v1/${placaClean}`,
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) }
    );

    // If BrasilAPI doesn't have plate lookup, try alternative
    // For now, try to match by searching our own database
    const marcaModelo = await matchPlacaToVeiculo(placaClean);

    if (marcaModelo) {
      // Cache the result
      await supabase.from("cache_placas").upsert({
        placa: placaClean,
        marca: marcaModelo.marca,
        modelo: marcaModelo.modelo,
        ano: marcaModelo.ano,
        veiculo_id: marcaModelo.veiculo_id,
      });

      return NextResponse.json({
        source: "api",
        ...marcaModelo,
      });
    }

    return NextResponse.json({
      error: "Veiculo nao encontrado. Tente buscar manualmente.",
      placa: placaClean,
    }, { status: 404 });

  } catch {
    return NextResponse.json({ error: "Erro na consulta. Tente novamente." }, { status: 500 });
  }
}

async function matchPlacaToVeiculo(placa: string): Promise<{marca: string; modelo: string; ano: number; veiculo_id: number} | null> {
  // For MVP: search our database trying to match
  // In production: integrate with APIBrasil, PlacaFipe, or Sinesp
  // The plate format can give us the year/state info

  // Mercosul format: ABC1D23 -> extract year from sequential
  // Old format: ABC-1234

  // For now, return null to trigger manual search fallback
  return null;
}
