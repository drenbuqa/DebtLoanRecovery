"use client";

import Topbar from "@/components/layout/Topbar";
import { CasesListView } from "@/components/cases/CasesListView";

export default function InactivePage() {
  return (
    <div className="flex flex-col">
      <Topbar
        title="Rastet Joaktive"
        subtitle="Dosjet me status joaktiv, mbyllur ose pezulluar"
        help={[{
          title: "Çfarë janë rastet joaktive?",
          body: "Dosjet joaktive janë ato me status Joaktiv, Mbyllur ose Pezulluar. Ato nuk janë në proces aktiv inkasimi por ruhen për referencë historike.",
        }]}
      />
      <CasesListView view="inactive" />
    </div>
  );
}
