"use client";

import Topbar from "@/components/layout/Topbar";
import { CasesListView } from "@/components/cases/CasesListView";

export default function VonesaPage() {
  return (
    <div className="flex flex-col">
      <Topbar
        title="Vonesat"
        subtitle="Klientë që dhanë premtim por data kaloi pa pagesë"
        help={[{
          title: "Çfarë janë vonesat?",
          body: "Këto janë rastet ku klienti ka dhënë premtim pagese por data e premtimit ka kaluar dhe pagesa nuk është regjistruar. Është e rëndësishme të kontaktoheni me këta klientë menjëherë.",
        }]}
      />
      <CasesListView view="vonesa" showPromiseDate />
    </div>
  );
}
