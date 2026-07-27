import type { PersistedMedia } from "../types";

interface EditMediaModalProps {
  media: PersistedMedia | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditMediaModal({
  media,
  isOpen,
  onClose,
}: EditMediaModalProps) {
  if (!isOpen || media === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">
          Edit Media
        </h2>

        <p className="mt-4 text-slate-300">
          Editing <span className="font-semibold">{media.title}</span>
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}