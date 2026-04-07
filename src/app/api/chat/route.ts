import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

export async function POST(req: NextRequest) {
  const { message, veiculo_id, user_id } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }

  // 1. Try to answer from database first (Layer 1 - free)
  const dbAnswer = await tryAnswerFromDB(message, veiculo_id);
  if (dbAnswer) {
    // Save to chat history
    if (user_id) {
      await saveChatMessage(user_id, "user", message, veiculo_id);
      await saveChatMessage(user_id, "assistant", dbAnswer, veiculo_id, "banco");
    }
    return NextResponse.json({ answer: dbAnswer, source: "banco" });
  }

  // 2. Use Claude Haiku for complex questions (Layer 2)
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({
      answer: "Desculpe, nao tenho essa informacao no momento. Tente buscar seu veiculo no Guia de Lubrificantes para ver as especificacoes completas.",
      source: "fallback",
    });
  }

  try {
    // Get vehicle context if available
    let contexto = "";
    if (veiculo_id) {
      const { data: v } = await supabase.from("veiculos").select("*").eq("id", veiculo_id).single();
      const { data: oleo } = await supabase.from("specs_oleo_motor").select("*").eq("veiculo_id", veiculo_id);
      const { data: fluidos } = await supabase.from("specs_fluidos").select("*").eq("veiculo_id", veiculo_id);
      if (v) contexto += `\nVeiculo: ${v.marca} ${v.modelo} ${v.ano_de} Motor: ${v.codigo_motor}`;
      if (oleo?.length) contexto += `\nOleo motor: ${oleo[0].viscosidade_sae} API ${oleo[0].categoria_api} ${oleo[0].aprovacao_oem} Capacidade: ${oleo[0].capacidade_com_filtro_litros}L`;
      if (fluidos?.length) {
        for (const f of fluidos) {
          contexto += `\n${f.tipo}: ${f.fluido || f.especificacao || ""} ${f.capacidade_litros ? f.capacidade_litros + "L" : ""}`;
        }
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        system: `Voce e um especialista em lubrificantes automotivos do Panther Connect.
Responda em portugues brasileiro, de forma clara e objetiva.
Sempre recomende consultar o manual do proprietario para confirmacao.
Se tiver dados do veiculo no contexto, use-os na resposta.
Nunca invente especificacoes. Se nao souber, diga que nao tem essa informacao.
Seja amigavel e profissional. Maximo 3 paragrafos.
${contexto ? "\nContexto do veiculo do usuario:" + contexto : ""}`,
        messages: [{ role: "user", content: message }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.content[0].text;
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    // Save to chat history
    if (user_id) {
      await saveChatMessage(user_id, "user", message, veiculo_id);
      await saveChatMessage(user_id, "assistant", answer, veiculo_id, "ai", tokens);
    }

    return NextResponse.json({ answer, source: "ai", tokens });

  } catch {
    return NextResponse.json({
      answer: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente em alguns instantes.",
      source: "error",
    });
  }
}

async function tryAnswerFromDB(message: string, veiculoId?: number): Promise<string | null> {
  const msg = message.toLowerCase();

  // Pattern matching for common questions
  if (veiculoId && (msg.includes("oleo") || msg.includes("óleo") || msg.includes("lubrificante"))) {
    const { data: oleo } = await supabase
      .from("specs_oleo_motor")
      .select("*")
      .eq("veiculo_id", veiculoId)
      .limit(1);

    if (oleo?.length) {
      const o = oleo[0];
      return `Para este veiculo, o oleo recomendado e:\n\n` +
        `**Viscosidade:** ${o.viscosidade_sae || "Consulte o manual"}\n` +
        `**Classificacao API:** ${o.categoria_api || "N/A"}\n` +
        `**Aprovacao OEM:** ${o.aprovacao_oem || "N/A"}\n` +
        `**Capacidade com filtro:** ${o.capacidade_com_filtro_litros ? o.capacidade_com_filtro_litros + "L" : "Consulte o manual"}\n` +
        `**Intervalo de troca:** ${o.intervalo_troca_km ? o.intervalo_troca_km.toLocaleString() + " km" : ""} ${o.intervalo_troca_meses ? "ou " + o.intervalo_troca_meses + " meses" : ""}\n\n` +
        (o.observacoes ? `📝 ${o.observacoes}` : "");
    }
  }

  if (veiculoId && (msg.includes("freio") || msg.includes("dot"))) {
    const { data: freio } = await supabase
      .from("specs_fluidos")
      .select("*")
      .eq("veiculo_id", veiculoId)
      .eq("tipo", "freio")
      .limit(1);

    if (freio?.length) {
      return `O fluido de freio recomendado e **${freio[0].especificacao || freio[0].fluido || "DOT 4"}**` +
        (freio[0].capacidade_litros ? ` com capacidade de ${freio[0].capacidade_litros}L` : "") +
        (freio[0].observacoes ? `.\n\n📝 ${freio[0].observacoes}` : ".");
    }
  }

  if (veiculoId && (msg.includes("arrefec") || msg.includes("coolant") || msg.includes("radiador"))) {
    const { data: arr } = await supabase
      .from("specs_fluidos")
      .select("*")
      .eq("veiculo_id", veiculoId)
      .eq("tipo", "arrefecimento")
      .limit(1);

    if (arr?.length) {
      return `O liquido de arrefecimento recomendado e **${arr[0].fluido || "Consulte o manual"}**` +
        (arr[0].concentracao ? ` na proporcao de ${arr[0].concentracao}` : "") +
        (arr[0].capacidade_litros ? ` com capacidade de ${arr[0].capacidade_litros}L` : "") +
        (arr[0].observacoes ? `.\n\n📝 ${arr[0].observacoes}` : ".");
    }
  }

  if (veiculoId && (msg.includes("filtro"))) {
    const { data: filtros } = await supabase
      .from("filtros_crossref")
      .select("*")
      .eq("veiculo_id", veiculoId);

    if (filtros?.length) {
      let resp = "Filtros compativeis para seu veiculo:\n\n";
      for (const f of filtros) {
        resp += `**Filtro de ${f.tipo_filtro}:**\n`;
        if (f.oem_codigo) resp += `  OEM: ${f.oem_codigo}\n`;
        if (f.tecfil) resp += `  Tecfil: ${f.tecfil}\n`;
        if (f.mann) resp += `  Mann: ${f.mann}\n`;
        if (f.wega) resp += `  Wega: ${f.wega}\n`;
        resp += "\n";
      }
      return resp;
    }
  }

  return null; // No DB answer, use AI
}

async function saveChatMessage(
  userId: string, role: string, conteudo: string,
  veiculoId?: number, fonte = "user", tokens = 0
) {
  await supabase.from("chat_mensagens").insert({
    user_id: userId,
    role,
    conteudo,
    veiculo_contexto_id: veiculoId || null,
    fonte,
    tokens_usados: tokens,
  });
}
