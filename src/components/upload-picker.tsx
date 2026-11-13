import { Upload } from "lucide-react";

/** UI only: file storage is not connected, so selecting files is disabled and nothing is uploaded. */
export function UploadPicker({ id, label, accept, hint }: { id: string; label: string; accept: string; hint: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-line p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-elevated text-muted"><Upload size={18} aria-hidden /></span>
        <input id={id} type="file" accept={accept} disabled className="text-sm text-muted" />
      </div>
      <p className="mt-1.5 text-xs text-muted">{hint} Uploads are unavailable until file storage is connected.</p>
    </div>
  );
}
