"use client";

import Topbar from "@/components/layout/Topbar";
import { CasesListView } from "@/components/cases/CasesListView";

export default function BrokenPromisesPage() {
  return (
    <div className="flex flex-col">
      <Topbar
        title="Premtime të Thyera"
        subtitle="Dosjet me premtime pagese të thyera (pa pagesë pas 30+ ditësh)"
        help={[{
          title: "Çfarë janë premtimet e thyera?",
          body: "Këto janë rastet ku klienti dha premtim pagese por kaluan më shumë se 30 ditë pa asnjë pagesë. Dosjet me premtime të thyera kërkojnë veprim të menjëhershëm dhe mund të eskalojnë.",
        }]}
      />
      <CasesListView view="premtime_thyera" showPromiseDate />
    </div>
  );
}
