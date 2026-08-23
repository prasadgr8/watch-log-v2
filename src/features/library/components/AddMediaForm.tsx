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
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-6 flex items-center gap-3">
        <Plus className="h-5 w-5 text-accent-text" />

        <h2 className="text-xl font-semibold text-primary">Add Media</h2>
      </div>

      <form className="grid gap-4 md:grid-cols-4" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <label
            className="mb-2 block text-sm font-medium text-muted"
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
            className="w-full rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-muted"
            htmlFor="media-type"
          >
            Type
          </label>

          <select
            id="media-type"
            value={mediaType}
            onChange={(event) => setMediaType(event.target.value as MediaType)}
            className="w-full rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
          >
            <option value="tv">TV Show</option>
            <option value="movie">Movie</option>
          </select>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-muted"
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
            className="w-full rounded-lg border border-border bg-input-bg px-4 py-2.5 text-primary outline-none transition focus:border-accent-hover focus:ring-2 focus:ring-accent-hover/20"
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
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-medium text-inverted transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />

            {isSaving ? "Saving..." : "Add to Library"}
          </button>
        </div>
      </form>
    </section>
  );
}
