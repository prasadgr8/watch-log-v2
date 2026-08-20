import { useState } from "react";
import type { PersistedMedia } from "../../../types/media";

interface EditMediaModalProps {
  media: PersistedMedia | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: {
    status: PersistedMedia["userStatus"];
    rating: number;
    notes: string;
  }) => void;
}

interface EditMediaFormProps {
  media: PersistedMedia;
  isSaving: boolean;
  onClose: () => void;
  onSave: EditMediaModalProps["onSave"];
}

export default function EditMediaModal({
  media,
  isOpen,
  isSaving,
  onClose,
  onSave,
}: EditMediaModalProps) {
  if (!isOpen || media === null) {
    return null;
  }

  return (
    <EditMediaForm
      key={media.id}
      media={media}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function EditMediaForm({
  media,
  isSaving,
  onClose,
  onSave,
}: EditMediaFormProps) {
  const [status, setStatus] = useState(media.userStatus);
  const [rating, setRating] = useState(media.rating ?? 0);
  const [notes, setNotes] = useState(media.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl bg-slate-900 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Edit Progress</h2>

        <div className="mt-5 border-b border-slate-700 pb-4">
          <h3 className="text-lg font-semibold text-white">{media.title}</h3>

          <p className="mt-1 text-sm text-slate-400">
            {media.mediaType === "movie" ? "Movie" : "TV Show"}
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="status"
            className="block text-sm font-medium text-slate-300"
          >
            Status
          </label>

          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="planned">Plan to Watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-300">
            Rating
          </label>

          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-2xl transition-transform hover:scale-110"
              >
                {star <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-slate-300"
          >
            Notes
          </label>

          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add your personal notes..."
            className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              onSave({
                status,
                rating,
                notes,
              })
            }
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
