"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type A = any;

interface StorySlide { type: "image" | "video"; url: string; caption?: string; cta?: { label: string; url: string }; }
interface Story { brand: string; color: string; slides: StorySlide[]; }

const stories: Story[] = [
  { brand: "Shell", color: "#DD1D21", slides: [
    { type: "image", url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=1000&fit=crop", caption: "Shell Helix Ultra 5W-30", cta: { label: "Saiba mais", url: "#" } },
    { type: "image", url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=1000&fit=crop", caption: "Protecao maxima para seu motor", cta: { label: "Ver produtos", url: "#" } },
  ]},
  { brand: "Mobil", color: "#1A47B8", slides: [{ type: "image", url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&h=1000&fit=crop", caption: "Mobil Super 3000 Formula D1", cta: { label: "Confira", url: "#" } }]},
  { brand: "Castrol", color: "#00984A", slides: [{ type: "image", url: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=1000&fit=crop", caption: "Castrol Edge com Titanium FST", cta: { label: "Conheca", url: "#" } }]},
  { brand: "Petronas", color: "#00695C", slides: [{ type: "image", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&h=1000&fit=crop", caption: "Petronas Syntium 3000 XS", cta: { label: "Ver oferta", url: "#" } }]},
  { brand: "Motul", color: "#E53935", slides: [{ type: "image", url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&h=1000&fit=crop", caption: "Motul 8100 Eco-Lite", cta: { label: "Saiba mais", url: "#" } }]},
];

const defaultCarImages: Record<string, string> = {
  chevrolet: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=200&fit=crop",
  fiat: "https://images.unsplash.com/photo-1606611013016-969c19ba27a5?w=400&h=200&fit=crop",
  volkswagen: "https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=400&h=200&fit=crop",
  toyota: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=200&fit=crop",
  hyundai: "https://images.unsplash.com/photo-1629897048514-3dd7414fe72a?w=400&h=200&fit=crop",
  honda: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=200&fit=crop",
  default: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=200&fit=crop",
};

type Mode = "home" | "placa" | "veiculo";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("home");
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");

  // User's cars
  const [meusCars, setMeusCars] = useState<A[]>([]);

  // Story viewer
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  // Search
  const [marcas, setMarcas] = useState<string[]>([]);
  const [anos, setAnos] = useState<number[]>([]);
  const [modelos, setModelos] = useState<string[]>([]);
  const [selMarca, setSelMarca] = useState("");
  const [selAno, setSelAno] = useState("");
  const [selModelo, setSelModelo] = useState("");
  const [resultados, setResultados] = useState<A[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placaInput, setPlacaInput] = useState("");
  const [placaLoading, setPlacaLoading] = useState(false);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (selMarca) loadAnos(); }, [selMarca]);
  useEffect(() => { if (selAno) loadModelos(); }, [selAno]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    setUserName(user.email?.split("@")[0] || "");

    // Load user's garage cars
    const { data: meus } = await supabase
      .from("meus_veiculos")
      .select("*, veiculos(id, marca, modelo, ano_de, codigo_motor)")
      .eq("user_id", user.id);
    if (meus) setMeusCars(meus);

    const { data } = await supabase.from("veiculos").select("marca").order("marca");
    if (data) setMarcas([...new Set(data.map((d: A) => d.marca))].sort());
    setReady(true);
  }

  async function loadAnos() {
    setSelAno(""); setSelModelo(""); setAnos([]); setModelos([]); setBuscou(false);
    const { data } = await supabase.from("veiculos").select("ano_de").eq("marca", selMarca).order("ano_de", { ascending: false });
    if (data) setAnos([...new Set(data.map((d: A) => d.ano_de).filter(Boolean))] as number[]);
  }
  async function loadModelos() {
    setSelModelo(""); setModelos([]); setBuscou(false);
    const { data } = await supabase.from("veiculos").select("modelo").eq("marca", selMarca).eq("ano_de", parseInt(selAno)).order("modelo");
    if (data) { const u = [...new Set(data.map((d: A) => d.modelo))].sort(); setModelos(u); if (u.length === 1) setSelModelo(u[0]); }
  }
  async function buscar() {
    setLoading(true); setBuscou(true);
    let q = supabase.from("veiculos").select("*").eq("marca", selMarca);
    if (selAno) q = q.eq("ano_de", parseInt(selAno));
    if (selModelo) q = q.eq("modelo", selModelo);
    const { data } = await q.order("ano_de", { ascending: false });
    if (data?.length === 1) { router.push(`/veiculo/${data[0].id}`); return; }
    setResultados(data || []); setLoading(false);
  }
  async function searchPlaca() {
    if (placaInput.length < 7) return;
    setPlacaLoading(true);
    try {
      const res = await fetch("/api/placa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placa: placaInput }) });
      const d = await res.json();
      if (d.veiculo_id) router.push(`/veiculo/${d.veiculo_id}`);
    } catch { /* */ }
    setPlacaLoading(false);
  }

  function goBack() { setMode("home"); setBuscou(false); setResultados([]); setSelMarca(""); setSelAno(""); setSelModelo(""); setPlacaInput(""); }

  if (!ready) return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <div className="h-6 w-32 rounded skeleton-shimmer mb-6" />
      <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-36 rounded-2xl skeleton-shimmer" />)}</div>
    </div>
  );

  const hasCars = meusCars.length > 0;

  return (
    <div className="mx-auto max-w-lg px-5 py-6 lg:max-w-2xl lg:px-8 lg:py-10">

      {/* HOME */}
      {mode === "home" && (
        <div className="page-enter">
          {/* Greeting */}
          <p className="text-muted-foreground text-[13px]">Ola, {userName}</p>
          <h1 className="text-xl font-bold mt-0.5 mb-6">
            {hasCars ? "Seus veiculos" : "Encontre as especificacoes"}
          </h1>

          {/* User's cars — dashboard pessoal */}
          {hasCars && (
            <div className="space-y-3 mb-8 animate-stagger">
              {meusCars.map((mv: A) => {
                const marca = mv.veiculos?.marca || "";
                const modelo = mv.veiculos?.modelo || "";
                const ano = mv.veiculos?.ano_de;
                const img = defaultCarImages[marca.toLowerCase()] || defaultCarImages.default;
                return (
                  <Link key={mv.id} href={`/veiculo/${mv.veiculos?.id}`} className="block pressable">
                    <div className="rounded-2xl overflow-hidden bg-foreground/[0.03]">
                      <div className="relative h-32">
                        <img src={img} alt={`${marca} ${modelo}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                          <div>
                            <p className="text-[15px] font-bold text-white capitalize">{marca} {modelo}</p>
                            <p className="text-[12px] text-white/60">{[ano, mv.veiculos?.codigo_motor].filter(Boolean).join(" · ")}</p>
                          </div>
                          {mv.km_atual && (
                            <span className="text-[11px] text-white/50">{Number(mv.km_atual).toLocaleString()} km</span>
                          )}
                        </div>
                        {mv.placa && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                            <span className="text-[10px] font-mono font-semibold text-white">{mv.placa}</span>
                          </div>
                        )}
                      </div>
                      {/* Quick actions */}
                      <div className="flex divide-x divide-foreground/5">
                        <button className="flex-1 py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors text-center">Ver specs</button>
                        <button onClick={(e) => { e.preventDefault(); router.push("/chat"); }} className="flex-1 py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors text-center">Perguntar ao AI</button>
                        <button onClick={(e) => { e.preventDefault(); router.push("/orcamento"); }} className="flex-1 py-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors text-center">Orcamento</button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Se nao tem carros — onboarding */}
          {!hasCars && (
            <div className="text-center py-8 mb-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-foreground/[0.03] mb-4">
                <svg className="h-9 w-9 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h.01M16 17h.01M3 11l1.5-5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.4L21 11M3 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-6M3 11h18" />
                </svg>
              </div>
              <p className="text-[15px] font-medium mb-1">Adicione seu primeiro veiculo</p>
              <p className="text-[13px] text-muted-foreground/60 mb-6 max-w-[260px] mx-auto">
                Busque por placa ou modelo e salve na garagem para acesso rapido.
              </p>
            </div>
          )}

          {/* Search CTAs */}
          <div className="space-y-3 mb-8">
            <h2 className="text-[13px] text-muted-foreground mb-2">{hasCars ? "Adicionar outro veiculo" : "Como buscar"}</h2>
            <button onClick={() => setMode("placa")} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors text-left pressable">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                <svg className="h-4.5 w-4.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h14.25c.621 0 1.125.504 1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621-.504 1.125-1.125 1.125H4.875a1.125 1.125 0 01-1.125-1.125V4.875z" />
                </svg>
              </div>
              <div className="flex-1"><p className="text-[14px] font-medium">Buscar por placa</p><p className="text-[12px] text-muted-foreground/60">Rapido e automatico</p></div>
              <svg className="h-4 w-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => setMode("veiculo")} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors text-left pressable">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                <svg className="h-4.5 w-4.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div className="flex-1"><p className="text-[14px] font-medium">Buscar por veiculo</p><p className="text-[12px] text-muted-foreground/60">Marca, ano e modelo</p></div>
              <svg className="h-4 w-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Stories */}
          <div>
            <h2 className="text-[13px] text-muted-foreground mb-3">Marcas parceiras</h2>
            <div className="flex gap-4 overflow-x-auto -mx-5 px-5 pb-2 scrollbar-none">
              {stories.map((s) => (
                <button key={s.brand} onClick={() => { setActiveStory(s); setSlideIndex(0); }} className="flex flex-col items-center gap-1.5 shrink-0 pressable">
                  <div className="h-14 w-14 rounded-full p-[2px]" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}88)` }}>
                    <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                      <span className="text-[9px] font-bold text-muted-foreground">{s.brand.slice(0, 2).toUpperCase()}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{s.brand}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer */}
      {activeStory && <StoryViewer story={activeStory} slideIndex={slideIndex}
        onNext={() => { if (slideIndex < activeStory.slides.length - 1) setSlideIndex(slideIndex + 1); else { const idx = stories.findIndex((s) => s.brand === activeStory.brand); if (idx < stories.length - 1) { setActiveStory(stories[idx + 1]); setSlideIndex(0); } else setActiveStory(null); } }}
        onPrev={() => { if (slideIndex > 0) setSlideIndex(slideIndex - 1); else { const idx = stories.findIndex((s) => s.brand === activeStory.brand); if (idx > 0) { setActiveStory(stories[idx - 1]); setSlideIndex(stories[idx - 1].slides.length - 1); } } }}
        onClose={() => setActiveStory(null)} />}

      {/* PLACA */}
      {mode === "placa" && (
        <div className="slide-in" key="placa">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar
          </button>
          <h2 className="text-xl font-bold mb-1">Buscar por placa</h2>
          <p className="text-sm text-muted-foreground mb-6">Digite a placa do seu veiculo</p>
          <input value={placaInput} onChange={(e) => setPlacaInput(e.target.value.toUpperCase())} maxLength={7} placeholder="ABC1D23" autoFocus
            onKeyDown={(e) => e.key === "Enter" && searchPlaca()}
            className="w-full h-14 rounded-xl bg-foreground/5 px-5 text-lg font-mono tracking-[0.3em] uppercase text-center placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10 mb-3" />
          <button onClick={searchPlaca} disabled={placaInput.length < 7 || placaLoading}
            className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 pressable">
            {placaLoading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      )}

      {/* VEICULO */}
      {mode === "veiculo" && (
        <div className="slide-in" key="veiculo">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>Voltar
          </button>
          <h2 className="text-xl font-bold mb-1">Buscar por veiculo</h2>
          <p className="text-sm text-muted-foreground mb-6">Selecione marca, ano e modelo</p>
          <div className="space-y-3 mb-4">
            <Sel value={selMarca} onChange={setSelMarca} options={marcas} placeholder="Marca" />
            <Sel value={selAno} onChange={setSelAno} options={anos.map(String)} placeholder="Ano" disabled={!selMarca} />
            <Sel value={selModelo} onChange={setSelModelo} options={modelos} placeholder="Modelo" disabled={!selAno} />
          </div>
          <button onClick={buscar} disabled={!selMarca || loading} className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-30 pressable">
            {loading ? "Buscando..." : "Buscar"}
          </button>
          {buscou && resultados.length > 0 && (
            <div className="mt-6 divide-y divide-foreground/5 animate-stagger">
              {resultados.map((v: A) => (
                <Link key={v.id} href={`/veiculo/${v.id}`} className="flex items-center justify-between py-4">
                  <div><p className="text-[15px] font-medium capitalize">{v.marca} {v.modelo}</p><p className="text-[13px] text-muted-foreground">{v.ano_de}{v.codigo_motor && ` · ${v.codigo_motor}`}</p></div>
                  <svg className="h-4 w-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          )}
          {buscou && resultados.length === 0 && !loading && <p className="text-center text-muted-foreground py-10">Nenhum veiculo encontrado</p>}
        </div>
      )}
    </div>
  );
}

function StoryViewer({ story, slideIndex, onNext, onPrev, onClose }: { story: Story; slideIndex: number; onNext: () => void; onPrev: () => void; onClose: () => void; }) {
  const slide = story.slides[slideIndex];
  useEffect(() => { const t = setTimeout(onNext, 5000); return () => clearTimeout(t); }, [slideIndex, story.brand]);
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" role="dialog">
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3 safe-top">
        {story.slides.map((_, i) => (<div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden"><div className={`h-full rounded-full bg-white ${i < slideIndex ? "w-full" : i === slideIndex ? "" : "w-0"}`} style={i === slideIndex ? { animation: "storyProgress 5s linear forwards" } : i < slideIndex ? { width: "100%" } : {}} /></div>))}
      </div>
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: story.color }}><span className="text-[9px] font-bold text-white">{story.brand.slice(0, 2).toUpperCase()}</span></div>
          <div><p className="text-[13px] font-semibold text-white">{story.brand}</p><p className="text-[10px] text-white/50">Patrocinado</p></div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
      <button onClick={onPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" />
      <button onClick={onNext} className="absolute right-0 top-0 bottom-0 w-2/3 z-10" />
      <img src={slide.url} alt={slide.caption || story.brand} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-8 pt-20 safe-bottom">
        {slide.caption && <p className="text-lg font-bold text-white mb-3">{slide.caption}</p>}
        {slide.cta && <a href={slide.cta.url} className="inline-flex h-11 items-center px-6 rounded-full bg-white text-black text-sm font-semibold">{slide.cta.label}</a>}
      </div>
      <style>{`@keyframes storyProgress { from { width: 0%; } to { width: 100%; } }`}</style>
    </div>
  );
}

function Sel({ value, onChange, options, placeholder, disabled }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string; disabled?: boolean; }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full h-12 appearance-none rounded-xl bg-foreground/5 px-4 text-sm capitalize disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-foreground/10" aria-label={placeholder}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
    </div>
  );
}
