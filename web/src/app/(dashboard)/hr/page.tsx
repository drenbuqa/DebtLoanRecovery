"use client";

import { useEffect, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { hrDocuments as hrApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  BookOpen, Upload, Trash2, FileText, FileSpreadsheet,
  File, Download, Eye, Plus, X, Loader2, AlertCircle,
  FilePdf,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "long", year: "numeric" });
}

function mimeIcon(mimeType: string) {
  if (mimeType === "application/pdf") return { icon: FileText, color: "text-red-500", bg: "bg-red-50 border-red-100" };
  if (mimeType.includes("word") || mimeType.includes("document")) return { icon: FileText, color: "text-blue-500", bg: "bg-blue-50 border-blue-100" };
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100" };
  return { icon: File, color: "text-gray-400", bg: "bg-gray-50 border-gray-100" };
}

// ── Upload modal ────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile]        = useState<File | null>(null);
  const [title, setTitle]      = useState("");
  const [desc, setDesc]        = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]      = useState("");
  const inputRef               = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file || !title.trim()) return;
    setUploading(true); setError("");
    try {
      await hrApi.upload(file, title.trim(), desc.trim() || undefined);
      onUploaded();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Ndodhi një gabim gjatë ngarkimit.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
              <Upload size={15} className="text-brand-600" />
            </div>
            <h2 className="text-[15px] font-semibold text-gray-900">Ngarko Dokument</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-2">Skedari</label>
            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); } }}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 cursor-pointer hover:border-brand-300 hover:bg-brand-50/40 transition-all">
                <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); } }} />
                <Upload size={20} className="text-gray-300" />
                <p className="text-[13px] text-gray-500">Tërhiq ose kliko për të zgjedhur</p>
                <p className="text-[11px] text-gray-400">PDF, Word, Excel, PowerPoint</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 border border-brand-200 bg-brand-50 rounded-xl">
                <FileText size={16} className="text-brand-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-gray-400">{fmtSize(file.size)}</p>
                </div>
                <button onClick={() => setFile(null)} className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0">Ndrysho</button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
              Titulli <span className="text-red-400">*</span>
            </label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="p.sh. Manuali i HR, Rregullorja e Brendshme..."
              className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Përshkrimi <span className="text-gray-400 font-normal">(opsional)</span></label>
            <textarea
              value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              placeholder="Përshkrim i shkurtër rreth dokumentit..."
              className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all resize-none" />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Anulo
          </button>
          <button
            onClick={submit} disabled={!file || !title.trim() || uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl transition-colors">
            {uploading ? <><Loader2 size={14} className="animate-spin" /> Duke ngarkuar…</> : <><Upload size={14} /> Ngarko</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document card ───────────────────────────────────────────────

function DocCard({ doc, canDelete, onDelete }: {
  doc: any;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const { icon: Icon, color, bg } = mimeIcon(doc.mimeType);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Jeni i sigurt që doni të fshini "${doc.title}"?`)) return;
    setDeleting(true);
    try { onDelete(doc.id); } finally { setDeleting(false); }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-sm transition-all group"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>

      {/* File type icon */}
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={20} className={color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-semibold text-gray-900 leading-snug truncate">{doc.title}</h3>
        {doc.description && (
          <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-[11px] text-gray-400">{doc.fileName}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{fmtSize(doc.fileSize)}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{fmtDate(doc.uploadedAt)}</span>
          {doc.uploadedBy && (
            <>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-[11px] text-gray-400">{doc.uploadedBy.fullName}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={hrApi.fileUrl(doc.id)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
          title="Hap dokumentin">
          <Eye size={12} />
          <span className="hidden sm:inline">Hap</span>
        </a>
        {canDelete && (
          <button
            onClick={handleDelete} disabled={deleting}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Fshi dokumentin">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────

export default function HrPage() {
  const { can } = useAuth();
  const [docs, setDocs]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  async function load() {
    setLoading(true);
    try { setDocs(await hrApi.list()); } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    try {
      await hrApi.delete(id);
      setDocs(d => d.filter(doc => doc.id !== id));
    } catch (e: any) {
      alert(e.message ?? "Gabim gjatë fshirjes.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar
        title="Manualet & Rregulloret"
        subtitle="Dokumentet e brendshme të kompanisë për stafin"
        help={[
          { title: "Çfarë gjenden këtu?", body: "Manualet dhe rregulloret e brendshme të DLR — dokumentet që stafi duhet të njohë dhe t'i ndjekë gjatë punës. Kliko 'Hap' tek çdo dokument për ta lexuar drejtpërdrejt." },
          { title: "Si të shtohet një dokument i ri?", body: "Administratorët dhe menaxherët mund të ngarkojnë dokumente të reja duke klikuar butonin 'Shto Dokument'. Pranohen formatet PDF, Word, Excel dhe PowerPoint." },
        ]}
      >
        {can("hr-document:upload") && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-xl transition-colors shadow-sm">
            <Plus size={15} />
            Shto Dokument
          </button>
        )}
      </Topbar>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-4 text-center"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <BookOpen size={24} className="text-gray-300" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-gray-700">Nuk ka dokumente të ngarkuara</p>
              <p className="text-[13px] text-gray-400 mt-1">
                {can("hr-document:upload")
                  ? "Kliko 'Shto Dokument' për të ngarkuar manualin ose rregulloren e parë."
                  : "Administratori do të ngarkojë dokumentet e nevojshme."}
              </p>
            </div>
            {can("hr-document:upload") && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold rounded-xl transition-colors">
                <Plus size={14} />
                Shto Dokumentin e Parë
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                canDelete={can("hr-document:delete")}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={load}
        />
      )}
    </div>
  );
}
