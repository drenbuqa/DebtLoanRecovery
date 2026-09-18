"use client";

import Topbar from "@/components/layout/Topbar";
import { CasesListView } from "@/components/cases/CasesListView";

export default function PromisesPage() {
  return (
    <div className="flex flex-col">
      <Topbar
        title="Premtimet e Pagesës"
        subtitle="Të gjitha dosjet me premtime pagese të regjistruara"
        help={[{
          title: "Çfarë janë premtimet e pagesës?",
          body: "Këto janë rastet ku klienti ka dhënë premtim gojor ose me shkrim se do të paguajë në një datë të caktuar. Lista tregon premtimin e fundit për çdo dosje.",
        }]}
      />
      <CasesListView view="all_promises" showPromiseDate />
    </div>
  );
}
