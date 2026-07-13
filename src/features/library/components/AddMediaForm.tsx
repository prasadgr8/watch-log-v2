import { type SubmitEvent, useState } from "react";
import { Plus } from "lucide-react";

import type { MediaType, WatchStatus } from "../../../types";
import { watchStatusOptions } from "../libraryOptions";

interface AddMediaFormValues {
  title: string;
  mediaType: MediaType;
  userStatus: WatchStatus;
}

interface AddMediaFormProps {
  isSaving: boolean;
  onSubmit: (values: AddMediaFormValues) => Promise<boolean>;
}

export default function AddMediaForm({
  isSaving,
  onSubmit,
}: AddMediaFormProps) {
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("tv");
  const [userStatus, setUserStatus] = useState<WatchStatus>("planned");

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const wasSaved = await onSubmit({
      title,
      mediaType,
      userStatus,
    });

    if (!wasSaved) {
      return;
    }

    setTitle("");
    setMediaType("tv");
    setUserStatus("planned");
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex items-center gap-3">
        <Plus className="h-5 w-5 text-blue-400" />

        <h2 className="text-xl font-semibold text-white">Add Media</h2>
      </div>

      <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <label
            className="mb-2 block text-sm font-medium text-slate-300"
            htmlFor="media-title"
          >
            Title
          </label>

          <input
            id="media-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter a TV show or movie title"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-300"
            htmlFor="media-type"
          >
            Type
          </label>

          <select
            id="media-type"
            value={mediaType}
            onChange={(event) => setMediaType(event.target.value as MediaType)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="tv">TV Show</option>
            <option value="movie">Movie</option>
          </select>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-300"
            htmlFor="watch-status"
          >
            Status
          </label>

          <select
            id="watch-status"
            value={userStatus}
            onChange={(event) =>
              setUserStatus(event.target.value as WatchStatus)
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {watchStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />

            {isSaving ? "Saving..." : "Add to Library"}
          </button>
        </div>
      </form>
    </section>
  );
}
