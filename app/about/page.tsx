"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Languages, ShieldCheck, Target, Wrench, BookOpen, Sparkles, AlertTriangle, Beaker, Eye, GitCompare, Type, Atom } from "lucide-react";

type Lang = "en" | "ko";

const CONTENT = {
  en: {
    backHome: "Back to FoldScout",
    title: "About FoldScout",
    subtitle: "The fast first-pass triage tool for the AlphaFold era.",
    nameHeading: "Why \"FoldScout\"?",
    nameBody: [
      "**Fold** — for protein folding, and as a clear nod to AlphaFold and the structure-prediction era this tool is built for.",
      "**Scout** — a scout runs ahead. Before a structural biologist invests in a deep workflow (PyMOL exploration, docking, MD), FoldScout does the fast first-pass triage: confidence, domains, caveats, next steps.",
      "It follows the naming convention of well-known structural-biology tools like **FoldX** and **FoldSeek**, so the intent is recognizable to the target audience at a glance.",
    ],
    problemTitle: "The problem we focused on",
    problemBody: [
      "AlphaFold predicted over 200 million protein structures. The bottleneck shifted from *predicting* structures to *interpreting* them.",
      "Every structural biologist still does the same first-pass dance for every new structure: open PyMOL → color by B-factor → eyeball pLDDT → tab over to UniProt → write a quick note for the lab notebook. It takes 10–15 minutes per structure, and it's pure overhead before real science can begin.",
      "Worse: when researchers try to use LLMs for this, the LLMs **hallucinate residue numbers and invent domain boundaries**, eroding trust in a domain where exact coordinates matter.",
    ],
    approachTitle: "How we approached it",
    approachBody: [
      "FoldScout collapses the 10–15 minute manual triage into ~30 seconds — without sacrificing trust.",
      "Three architectural decisions enable this:",
    ],
    approachPoints: [
      {
        title: "Real data layer first, LLM last",
        body: "The structure (AlphaFold DB / PDB / ESMFold), confidence (per-residue pLDDT parsing), annotations (UniProt features), and variant data (AlphaMissense) are fetched from authoritative sources. Only after this ground truth is assembled does Gemini get called.",
      },
      {
        title: "Grounded prompting",
        body: "UniProt features (domains, active sites, binding sites) are injected verbatim into the prompt as authoritative ground truth, with explicit instructions to never invent residue numbers. Temperature is set to 0.2 to suppress embellishment.",
      },
      {
        title: "Source transparency",
        body: "The UI shows a \"grounded in UniProt facts\" badge and an expandable list of every feature used to generate the report. Users can audit the AI output against the ground truth in one click.",
      },
    ],
    featuresTitle: "Features",
    featuresList: [
      { icon: "Atom", title: "AlphaFold DB + RCSB PDB lookup", body: "Paste a UniProt or PDB ID and pull the structure instantly." },
      { icon: "Type", title: "Sequence mode (ESMFold)", body: "Paste a raw amino acid sequence (≤400 aa) and get a structure prediction." },
      { icon: "ShieldCheck", title: "Grounded AI report", body: "UniProt features injected into the prompt, temperature 0.2, strict anti-hallucination rules." },
      { icon: "Eye", title: "Three coloring modes", body: "pLDDT (confidence), Spectrum (N→C), AlphaMissense (per-residue pathogenicity)." },
      { icon: "GitCompare", title: "Side-by-side compare", body: "Analyze two proteins in parallel — pLDDT, structure, AI report all visible at once." },
      { icon: "Languages", title: "Korean / English toggle", body: "Switch language and the report regenerates automatically." },
    ],
    howTitle: "How to use it",
    howSteps: [
      {
        title: "Pick a mode",
        body: "**ID lookup** for known proteins (UniProt or PDB), or **Sequence (ESMFold)** for your own short sequence.",
      },
      {
        title: "Enter the input",
        body: "Try a preset (🔴 TP53, 🟢 GFP, 🦠 SARS-CoV-2 Spike) or type your own. Sequence mode also provides demo presets (Ubiquitin, Insulin, Lysozyme).",
      },
      {
        title: "Read the structure card",
        body: "3D viewer (auto-spinning, pLDDT-colored), per-residue pLDDT chart with confidence bands, mean pLDDT badge.",
      },
      {
        title: "Read the AI report",
        body: "Five sections: Overview, Structural Confidence, Functional Interpretation, Caveats, Next Steps. Every residue range cited comes from UniProt — auditable via the expandable \"UniProt facts used\" section below the report.",
      },
      {
        title: "Try the extra features",
        body: "Toggle AlphaMissense coloring to see pathogenic hotspots in red. Open compare mode to load a second protein. Switch language to regenerate the report in Korean.",
      },
    ],
    notTitle: "What FoldScout is NOT",
    notList: [
      "**Not** a replacement for PyMOL, ChimeraX, or MD simulations — it's the triage step *before* those tools.",
      "**Not** a definitive functional annotation — it's a fast review grounded in UniProt; the user remains the expert.",
      "**Not** an experimental structure determination tool — it visualizes existing predictions and experimental structures.",
    ],
    builtBy: "Built by",
    sehoonBio: "Sehoon Park — Post-Master Researcher @ KBSI Biopharmaceutical Research Center. M.S. AI, Hanyang University. CASP16 Antibody/Peptide 3rd place · Gemini 3 Seoul Hackathon Top 6 (Google DeepMind). Built in 90 minutes for the Genspark Hackathon 2026.",
  },
  ko: {
    backHome: "FoldScout으로 돌아가기",
    title: "FoldScout 소개",
    subtitle: "AlphaFold 시대를 위한 빠른 1차 구조 검토 도구.",
    nameHeading: "왜 \"FoldScout\"인가?",
    nameBody: [
      "**Fold** — 단백질 폴딩(folding)이자, 이 도구가 만들어진 시대인 **AlphaFold**에 대한 직접적인 오마주.",
      "**Scout** — 정찰병은 본대보다 먼저 갑니다. 연구자가 PyMOL 탐색, 도킹, MD 시뮬레이션 같은 심층 워크플로우에 시간을 투자하기 **전에** FoldScout이 신뢰도/도메인/주의사항/다음 단계를 빠르게 정찰합니다.",
      "**FoldX**, **FoldSeek** 같은 구조생물학 표준 도구의 명명 컨벤션을 따라 — 대상 커뮤니티가 이름만 봐도 의도를 파악할 수 있도록 했습니다.",
    ],
    problemTitle: "초점을 맞춘 문제",
    problemBody: [
      "AlphaFold가 2억 개 이상의 단백질 구조를 예측했습니다. 병목은 **예측**에서 **해석**으로 이동했습니다.",
      "구조생물학자는 새 단백질을 마주할 때마다 동일한 1차 작업을 반복합니다: PyMOL 열기 → B-factor 색칠 → pLDDT 확인 → UniProt 탭 열기 → 노트에 정리. 구조당 10–15분 — 실제 과학을 시작하기 전의 순수한 오버헤드입니다.",
      "더 큰 문제: 이 작업에 LLM을 쓰면 **잔기 번호를 만들어내고 도메인 경계를 지어내는** 환각이 발생합니다. 좌표가 절대적으로 중요한 도메인에서 신뢰를 무너뜨립니다.",
    ],
    approachTitle: "해결 접근법",
    approachBody: [
      "FoldScout은 10–15분의 수동 작업을 약 30초로 압축합니다 — 신뢰성을 잃지 않으면서.",
      "이를 가능하게 하는 세 가지 아키텍처 결정:",
    ],
    approachPoints: [
      {
        title: "실제 데이터 레이어 우선, LLM은 마지막",
        body: "구조(AlphaFold DB / PDB / ESMFold), 신뢰도(잔기별 pLDDT 파싱), 어노테이션(UniProt features), 변이 데이터(AlphaMissense)를 공식 소스에서 모두 가져옵니다. 이 ground truth가 완성된 **후에야** Gemini가 호출됩니다.",
      },
      {
        title: "Grounded prompting",
        body: "UniProt features(도메인, 활성 부위, 결합 부위)가 ground truth로 프롬프트에 그대로 주입되며, '잔기 번호를 절대 만들어내지 말 것'이라는 명시적 지시가 포함됩니다. Temperature는 0.2로 낮춰 과장된 추측을 억제합니다.",
      },
      {
        title: "출처 투명성",
        body: "UI에 'UniProt fact에 기반' 배지가 표시되며, 리포트 생성에 사용된 모든 feature를 펼쳐 볼 수 있습니다. 사용자는 한 번의 클릭으로 AI 출력을 ground truth와 대조 검증할 수 있습니다.",
      },
    ],
    featuresTitle: "주요 기능",
    featuresList: [
      { icon: "Atom", title: "AlphaFold DB + RCSB PDB 조회", body: "UniProt 또는 PDB ID를 붙여넣으면 즉시 구조를 가져옵니다." },
      { icon: "Type", title: "서열 모드 (ESMFold)", body: "원시 아미노산 서열(≤400 aa)을 붙여넣으면 ESMFold로 구조를 예측합니다." },
      { icon: "ShieldCheck", title: "Grounded AI 리포트", body: "UniProt features를 프롬프트에 주입, temperature 0.2, 엄격한 anti-hallucination 규칙." },
      { icon: "Eye", title: "세 가지 컬러링 모드", body: "pLDDT(신뢰도), Spectrum(N→C), AlphaMissense(잔기별 병원성)." },
      { icon: "GitCompare", title: "병렬 비교 모드", body: "두 단백질을 나란히 분석 — pLDDT, 구조, AI 리포트를 동시에 표시." },
      { icon: "Languages", title: "한국어 / English 토글", body: "언어를 전환하면 리포트가 자동으로 재생성됩니다." },
    ],
    howTitle: "사용 방법",
    howSteps: [
      {
        title: "모드 선택",
        body: "알려진 단백질이면 **ID 조회** (UniProt / PDB), 직접 만든 서열이면 **서열 입력 (ESMFold)**.",
      },
      {
        title: "입력값 넣기",
        body: "프리셋(🔴 TP53, 🟢 GFP, 🦠 SARS-CoV-2 Spike)을 클릭하거나 직접 입력. 서열 모드도 데모 프리셋(Ubiquitin, Insulin, Lysozyme) 제공.",
      },
      {
        title: "구조 카드 확인",
        body: "3D 뷰어(자동 회전, pLDDT 색상), 잔기별 pLDDT 차트(신뢰도 밴드 포함), 평균 pLDDT 배지.",
      },
      {
        title: "AI 리포트 읽기",
        body: "5개 섹션: 개요, 구조 신뢰도, 기능적 해석, 주의사항, 권장 후속 분석. 인용된 모든 잔기 범위는 UniProt에서 옴 — 리포트 아래 'UniProt fact 활용' 섹션을 펼쳐 검증 가능.",
      },
      {
        title: "추가 기능 사용",
        body: "AlphaMissense 컬러링으로 병원성 핫스팟을 빨간색으로 시각화. 비교 모드로 두 번째 단백질 로드. 언어 토글로 한국어 리포트 재생성.",
      },
    ],
    notTitle: "FoldScout이 아닌 것",
    notList: [
      "PyMOL, ChimeraX, MD 시뮬레이션의 **대체재가 아닙니다** — 그 도구들을 사용하기 *전*의 triage 단계입니다.",
      "**확정적인 기능 어노테이션이 아닙니다** — UniProt에 기반한 빠른 검토일 뿐, 전문가 판단은 사용자의 몫.",
      "**실험적 구조 결정 도구가 아닙니다** — 기존 예측 및 실험 구조를 시각화/해석합니다.",
    ],
    builtBy: "제작",
    sehoonBio: "박세훈 — KBSI 바이오의약품연구센터 Post-Master 연구원. 한양대학교 AI 석사. CASP16 Antibody/Peptide 3위 · Google DeepMind Gemini 3 Seoul Hackathon Top 6. Genspark Hackathon 2026에서 90분 안에 제작.",
  },
};

const ICONS: Record<string, any> = { Atom, Type, ShieldCheck, Eye, GitCompare, Languages, Sparkles, AlertTriangle, Beaker, Target, Wrench, BookOpen };

export default function AboutPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = CONTENT[lang];

  return (
    <main className="min-h-screen bg-[#070b14] text-slate-100">
      <header className="border-b border-slate-800/70 backdrop-blur sticky top-0 z-20 bg-[#070b14]/85">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t.backHome}
          </Link>
          <button
            onClick={() => setLang(lang === "en" ? "ko" : "en")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-xs border border-slate-700"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "en" ? "한국어로" : "English"}
          </button>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl">🧬</div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent">
              {t.title}
            </h1>
          </div>
          <p className="text-slate-400 text-lg">{t.subtitle}</p>
        </div>

        {/* Name */}
        <Section icon={BookOpen} title={t.nameHeading}>
          <div className="space-y-3">
            {t.nameBody.map((p, i) => (
              <p key={i} className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: bold(p) }} />
            ))}
          </div>
        </Section>

        {/* Problem */}
        <Section icon={Target} title={t.problemTitle}>
          <div className="space-y-3">
            {t.problemBody.map((p, i) => (
              <p key={i} className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: bold(p) }} />
            ))}
          </div>
        </Section>

        {/* Approach */}
        <Section icon={Wrench} title={t.approachTitle}>
          <div className="space-y-3 mb-5">
            {t.approachBody.map((p, i) => (
              <p key={i} className="text-slate-300 leading-relaxed">{p}</p>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {t.approachPoints.map((pt, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-xs text-violet-300 font-semibold mb-1.5">0{i + 1}</div>
                <h4 className="font-semibold text-slate-100 text-sm mb-2">{pt.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{pt.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Features */}
        <Section icon={Sparkles} title={t.featuresTitle}>
          <div className="grid sm:grid-cols-2 gap-3">
            {t.featuresList.map((f, i) => {
              const IconCmp = ICONS[f.icon] ?? Sparkles;
              return (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <IconCmp className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm mb-1">{f.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* How to use */}
        <Section icon={Beaker} title={t.howTitle}>
          <ol className="space-y-3">
            {t.howSteps.map((s, i) => (
              <li key={i} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 text-slate-900 flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm mb-1">{s.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: bold(s.body) }} />
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* What it's NOT */}
        <Section icon={AlertTriangle} title={t.notTitle}>
          <ul className="space-y-2">
            {t.notList.map((p, i) => (
              <li key={i} className="text-sm text-slate-300 leading-relaxed pl-4 border-l-2 border-amber-700/50" dangerouslySetInnerHTML={{ __html: bold(p) }} />
            ))}
          </ul>
        </Section>

        {/* Built by */}
        <div className="mt-16 pt-8 border-t border-slate-800/60">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{t.builtBy}</div>
          <p className="text-sm text-slate-300 leading-relaxed">{t.sehoonBio}</p>
          <p className="text-xs text-slate-500 mt-4">GitHub: <a className="text-cyan-300 hover:underline" href="https://github.com/sehooni" target="_blank" rel="noreferrer">@sehooni</a></p>
        </div>
      </article>
    </main>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-cyan-300" />
        <h2 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function bold(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.+?)\*\*/g, "<strong class=\"text-slate-100\">$1</strong>");
}
