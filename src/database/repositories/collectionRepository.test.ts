import { describe, expect, it } from "vitest";

import { db } from "../db";

import {
  collectionRepository,
  episodeRepository,
  mediaRepository,
} from "./index";

import type { PersistedCollection, PersistedMedia, TVShow } from "../../types";

const NOW = new Date("2026-07-15T00:00:00.000Z");

function createTvShow(title = "Breaking Bad"): TVShow {
  return {
    tmdbId: 1396,
    mediaType: "tv",
    title,
    userStatus: "watching",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function createLibraryMedia(
  title = "Breaking Bad",
): Promise<PersistedMedia> {
  const id = await mediaRepository.add(createTvShow(title));

  const media = await mediaRepository.getById(id);

  if (!media || media.id === undefined) {
    throw new Error("Media was not persisted.");
  }

  return media as PersistedMedia;
}

async function createCollection(
  name = "Favourites",
): Promise<PersistedCollection> {
  const id = await collectionRepository.add({
    name,
    createdAt: NOW,
    updatedAt: NOW,
  });

  const collection = await collectionRepository.getById(id);

  if (!collection) {
    throw new Error("Collection was not persisted.");
  }

  return collection;
}

describe("collectionRepository", () => {
  it("creates a collection with a generated id", async () => {
    const collection = await createCollection("Favourites");

    expect(collection.id).toBeGreaterThan(0);
    expect(collection.name).toBe("Favourites");
    expect(collection.createdAt).toEqual(NOW);
    expect(collection.updatedAt).toEqual(NOW);
  });

  it("reads a collection by id and returns undefined for missing ids", async () => {
    const collection = await createCollection();

    expect(await collectionRepository.getById(collection.id)).toMatchObject({
      name: "Favourites",
    });

    expect(await collectionRepository.getById(99999)).toBeUndefined();
  });

  it("lists all collections", async () => {
    await createCollection("Favourites");
    await createCollection("Weekend Watch");

    const collections = await collectionRepository.getAll();

    expect(collections).toHaveLength(2);
    expect(collections.map((entry) => entry.name).sort()).toEqual([
      "Favourites",
      "Weekend Watch",
    ]);
  });

  it("counts collections", async () => {
    expect(await collectionRepository.count()).toBe(0);

    await createCollection();

    expect(await collectionRepository.count()).toBe(1);
  });

  it("renames a collection and advances updatedAt", async () => {
    const collection = await createCollection("Old Name");

    const updatedRows = await collectionRepository.update(collection.id, {
      name: "New Name",
    });

    expect(updatedRows).toBe(1);

    const renamed = await collectionRepository.getById(collection.id);

    expect(renamed).toMatchObject({ name: "New Name" });
    expect(renamed?.updatedAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("deletes a collection and its memberships without touching library data", async () => {
    const mediaA = await createLibraryMedia("Show A");
    const mediaB = await createLibraryMedia("Show B");

    const episodeId = await episodeRepository.add({
      showId: mediaA.id,
      tmdbId: 62085,
      seasonNumber: 1,
      episodeNumber: 1,
      title: "Pilot",
      watched: false,
      createdAt: NOW,
      updatedAt: NOW,
    });

    await episodeRepository.markWatched(episodeId);

    const doomed = await createCollection("Doomed");
    const survivor = await createCollection("Survivor");

    await collectionRepository.addMedia(doomed.id, mediaA.id);
    await collectionRepository.addMedia(doomed.id, mediaB.id);
    await collectionRepository.addMedia(survivor.id, mediaA.id);

    await collectionRepository.remove(doomed.id);

    expect(await collectionRepository.getById(doomed.id)).toBeUndefined();
    expect(
      await db.collectionMedia.where("collectionId").equals(doomed.id).count(),
    ).toBe(0);

    // The other collection and its membership are untouched.
    expect(await collectionRepository.getById(survivor.id)).toBeDefined();
    expect(
      await db.collectionMedia
        .where("[collectionId+mediaId]")
        .equals([survivor.id, mediaA.id])
        .count(),
    ).toBe(1);

    // Underlying library data is intact: media, episodes, and watch history.
    expect(await mediaRepository.getById(mediaA.id)).toBeDefined();
    expect(await mediaRepository.getById(mediaB.id)).toBeDefined();
    expect(await episodeRepository.getByShowId(mediaA.id)).toHaveLength(1);
    expect(
      await db.watchHistory.where("episodeId").equals(episodeId).count(),
    ).toBe(1);
  });

  it("adds existing media to a collection", async () => {
    const media = await createLibraryMedia();
    const collection = await createCollection();

    const result = await collectionRepository.addMedia(
      collection.id,
      media.id,
    );

    expect(result).toEqual({ ok: true });

    const memberships = await collectionRepository.getMembershipsByCollection(
      collection.id,
    );

    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      collectionId: collection.id,
      mediaId: media.id,
    });
    expect(memberships[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("reports a missing collection without writing anything", async () => {
    const media = await createLibraryMedia();

    const result = await collectionRepository.addMedia(99999, media.id);

    expect(result).toEqual({ ok: false, reason: "collection-missing" });
    expect(await db.collectionMedia.count()).toBe(0);
  });

  it("reports missing media without writing anything", async () => {
    const collection = await createCollection();

    const result = await collectionRepository.addMedia(collection.id, 99999);

    expect(result).toEqual({ ok: false, reason: "media-missing" });
    expect(await db.collectionMedia.count()).toBe(0);
  });

  it("reports duplicate memberships and keeps a single row", async () => {
    const media = await createLibraryMedia();
    const collection = await createCollection();

    expect(
      await collectionRepository.addMedia(collection.id, media.id),
    ).toEqual({ ok: true });

    expect(
      await collectionRepository.addMedia(collection.id, media.id),
    ).toEqual({ ok: false, reason: "duplicate" });

    expect(await db.collectionMedia.count()).toBe(1);
  });

  it("allows the same media in multiple collections", async () => {
    const media = await createLibraryMedia();
    const first = await createCollection("First");
    const second = await createCollection("Second");

    expect(await collectionRepository.addMedia(first.id, media.id)).toEqual({
      ok: true,
    });
    expect(await collectionRepository.addMedia(second.id, media.id)).toEqual({
      ok: true,
    });

    const memberships = await collectionRepository.getMembershipsByMedia(
      media.id,
    );

    expect(memberships).toHaveLength(2);
  });

  it("allows multiple media items in one collection", async () => {
    const mediaA = await createLibraryMedia("Show A");
    const mediaB = await createLibraryMedia("Show B");
    const collection = await createCollection();

    expect(await collectionRepository.addMedia(collection.id, mediaA.id)).toEqual({
      ok: true,
    });
    expect(await collectionRepository.addMedia(collection.id, mediaB.id)).toEqual({
      ok: true,
    });

    expect(
      await collectionRepository.getMembershipsByCollection(collection.id),
    ).toHaveLength(2);
  });

  it("removes media from a collection idempotently", async () => {
    const media = await createLibraryMedia();
    const collection = await createCollection();

    await collectionRepository.addMedia(collection.id, media.id);
    await collectionRepository.removeMedia(collection.id, media.id);

    expect(
      await collectionRepository.getMembershipsByCollection(collection.id),
    ).toHaveLength(0);

    // Removing again is a no-op.
    await collectionRepository.removeMedia(collection.id, media.id);

    expect(await db.collectionMedia.count()).toBe(0);

    // The media item itself is untouched.
    expect(await mediaRepository.getById(media.id)).toBeDefined();
  });

  it("lists the collections containing a media item", async () => {
    const media = await createLibraryMedia();
    const other = await createLibraryMedia("Other Show");
    const first = await createCollection("First");
    const second = await createCollection("Second");

    await collectionRepository.addMedia(first.id, media.id);
    await collectionRepository.addMedia(second.id, media.id);
    await collectionRepository.addMedia(first.id, other.id);

    const memberships = await collectionRepository.getMembershipsByMedia(
      media.id,
    );

    expect(memberships).toHaveLength(2);
    expect(memberships.map((membership) => membership.collectionId).sort()).toEqual(
      [first.id, second.id].sort(),
    );
  });
});
