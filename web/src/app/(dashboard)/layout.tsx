"use client";

import { usePathname } from "next/navigation";
import { SWRConfig } from "swr";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { useEffect, useRef, useState } from "react";
import { confidentiality as confApi } from "@/lib/api";
import { ShieldCheck, ChevronDown } from "lucide-react";

// ── Confidentiality declaration text ─────────────────────────────────────────

const DECLARATION_POINTS = [
  "Unë e kuptoj se përdorimi dhe zbulimi i të dhënave personale në lidhje me klientët dhe punën do të trajtohet ligjërisht nga DLR shpk. Unë nuk do të përdor ose përhap asnjë të dhënë personale që marr në dijeni gjatë punës time për ndonjë qëllim që është në kundërshtim me qëllimet e kësaj pune.",
  "Unë e kuptoj se jam i detyruar të ruajë konfidencialitetin për të dhënat personale dhe t'i mbajë ato të sigurta, duke marrë të gjitha masat organizative dhe teknike të përshtatshme.",
  "Deklaroj se të dhënat do t'i mbaj në mënyrë korrekte, të kujdesshme, të sakta, të plota dhe të përditësuara.",
  "Deklaroj se Etika është një element shumë i rëndësishëm gjatë punës dhe për këtë arsye do të inkurajoj sjellje të kulturës së sigurisë. Unë e kuptoj se sjellja e kulturës së sigurisë është zbatimi i parimit të konfidencialitetit që do të thotë se me të dhënat e përpunuara që vihem në dijeni gjatë ushtrimit të funksionit si punonjës në DLR shpk jam i detyruar të ruaj konfidencialitetin dhe besueshmërinë edhe pas përfundimit të marrëdhënies së punës me DLR shpk.",
  "Marr përgjegjësinë e plotë që në qoftë se konstatohet që kam vepruar në kundërshtim me udhëzimet në lidhje me konfidencialitetin e të dhënave personale apo në rast të mosruajtjes së tyre, ndaj meje të merren masa të menjëhershme. Unë e kuptoj këtë veprim si një nevojë për të mbajtur standarte të larta profesionale në DLR shpk.",
  "Unë e kuptoj se ky detyrim vlen gjatë afatit të punësimit si dhe pas përfundimit të tij.",
  "Unë e kuptoj se moszbatimi i kësaj Deklarate do të trajtohet ligjërisht.",
];

// ── Confidentiality modal ─────────────────────────────────────────────────────

function ConfidentialityModal({ user, onAccepted }: { user: any; onAccepted: () => void }) {
  const [scrolled, setScrolled]   = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [leaving, setLeaving]     = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = bodyRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
    if (atBottom) setScrolled(true);
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      await confApi.accept();
      setLeaving(true);
      setTimeout(onAccepted, 400);
    } catch {
      setAccepting(false);
    }
  }

  const today = new Date().toLocaleDateString("sq-AL", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-400 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(4px)" }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: "calc(100vh - 48px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)",
        }}>

        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-widest mb-1">
                DLR shpk — Deklaratë e Detyrueshme
              </p>
              <h1 className="text-[20px] font-bold text-gray-900 leading-tight">
                Mbrojtja e të Dhënave Personale<br className="hidden sm:block" /> dhe Konfidencialitetit
              </h1>
              <p className="text-[13px] text-gray-500 mt-1.5">
                Lexojeni me kujdes këtë deklaratë. Pranimi juaj do të regjistrohet.
              </p>
            </div>
          </div>
        </div>

        {/* Scroll body */}
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-5"
          style={{ overscrollBehavior: "contain" }}>

          <p className="text-[13px] text-gray-700 leading-relaxed">
            Me anë të kësaj deklarate marr përsipër të mos përdor dhe të mos i transmetoj personave të jashtëm
            dhe të paautorizuar të dhëna personale apo informacione konfidenciale në lidhje me ose të marra
            nga puna nga DLR shpk, përveç nëse autorizohem shprehimisht nga DLR shpk, ose kërkohet me ligj.
            Këto të dhëna dhe informata personale mund të përdoren vetëm për qëllime të biznesit dhe asnjëherë
            nuk duhet të diskutohen apo t'u zbulohen njerëzve të pa-autorizuar. Nevoja e konfidencialitetit
            vlen për të gjithë, përfshirë familjen, miqtë dhe lidhjet tjera.
          </p>

          <p className="text-[13px] text-gray-700 leading-relaxed">
            Shembuj të tjerë të informatave konfidenciale përpos informatave për klientët përfshijnë, por nuk
            kufizohen me të dhënat për punonjësit tjerë të DLR shpk, materiale tjera të punës si diagramet,
            memorandumet, dokumentet, manualet, raportet, regjistrat, software apo hardware të punës ne DLR
            shpk apo pajisjet e procesimit të fjalëve, materialet trajnuese, deklarata dhe regjistrat e ngjajshëm.
            Kur punonjësi largohet nga DLR shpk, ai nuk mund të marrë me vete ndonjë informatë konfidenciale.
          </p>

          <div className="w-full border-t border-dashed border-gray-200 my-2" />

          <ol className="space-y-4">
            {DECLARATION_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[13px] text-gray-700 leading-relaxed">{point}</p>
              </li>
            ))}
          </ol>

          <div className="w-full border-t border-gray-200 mt-4 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-[12px] text-gray-500">Punonjësi</p>
                <p className="text-[14px] font-semibold text-gray-800 mt-0.5">{user?.fullName}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-gray-500">Data</p>
                <p className="text-[14px] font-semibold text-gray-800 mt-0.5">{today}</p>
              </div>
            </div>
          </div>

          {/* Spacer so they can scroll all the way */}
          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-8 py-6 border-t border-gray-100 bg-gray-50/50">
          {!scrolled && (
            <div className="flex items-center justify-center gap-1.5 mb-4 text-[12px] text-gray-400">
              <ChevronDown size={13} className="animate-bounce" />
              <span>Lëvizni poshtë për të lexuar të gjithë deklaratën</span>
              <ChevronDown size={13} className="animate-bounce" />
            </div>
          )}
          <button
            onClick={handleAccept}
            disabled={!scrolled || accepting}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
              scrolled
                ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow-md active:scale-[0.99]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}>
            {accepting
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Duke regjistruar…</>
              : <><ShieldCheck size={16} /> Pranoj Deklaratën e Konfidencialitetit</>}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-3 leading-relaxed">
            Duke klikuar &ldquo;Pranoj&rdquo; ju konfirmoni se e keni lexuar, kuptuar dhe pranuar<br />
            këtë deklaratë. Ky veprim regjistrohet me datën dhe emrin tuaj.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Layout internals ──────────────────────────────────────────────────────────

function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useKeyboardShortcuts();
  return (
    <div key={pathname} className="animate-page-in min-h-full">
      {children}
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [confChecked, setConfChecked]   = useState(false);
  const [confAccepted, setConfAccepted] = useState(true); // optimistic — hide until we know

  useEffect(() => {
    if (!user) return;
    confApi.status()
      .then(({ accepted }) => {
        setConfAccepted(accepted);
        setConfChecked(true);
      })
      .catch(() => {
        // On error, don't block — just show the app
        setConfAccepted(true);
        setConfChecked(true);
      });
  }, [user?.id]);

  if (loading || !confChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F5F7]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto mobile-nav-pad md:pb-0">
            <PageWrapper>{children}</PageWrapper>
          </main>
        </div>
      </div>
      <MobileNav />
      {!confAccepted && (
        <ConfidentialityModal
          user={user}
          onAccepted={() => setConfAccepted(true)}
        />
      )}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }}>
      <AuthProvider>
        <ToastProvider>
          <AuthenticatedLayout>{children}</AuthenticatedLayout>
        </ToastProvider>
      </AuthProvider>
    </SWRConfig>
  );
}
