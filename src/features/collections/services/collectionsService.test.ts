import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../../../database/db";

import {
  collectionRepository,
  mediaRepository,
} from "../../../database/repositories";

import { collectionsService } from "./collectionsService";

describe("collectionsService", () => {
  beforeEach(async () => {
    await Promise.all([
      db.media.clear(),
      db.episodes.clear(),
      db.watchHistory.clear(),
      db.collections.clear(),
      db.collectionMedia.clear(),
    ]);
  });

  describe("createCollection", () => {
    it("creates a collection with trimmed name and timestamps", async () => {
      const id = await collectionsService.createCollection("  Watch Later  ");

      expect(id).toBeGreaterThan(0);

      const collection = await collectionRepository.getById(id);
      expect(collection).toMatchObject({ name: "Watch Later" });
      expect(collection?.createdAt).toBeInstanceOf(Date);
      expect(collection?.updatedAt).toBeInstanceOf(Date);
    });

    it("rejects empty names", async () => {
      await expect(collectionsService.createCollection("   ")).rejects.toThrow(
        /required/i,
      );
    });
  });

  describe("renameCollection", () => {
    it("renames an existing collection", async () => {
      const id = await collectionsService.createCollection("Old Name");

      await collectionsService.renameCollection(id, "New Name");

      const collection = await collectionRepository.getById(id);
      expect(collection?.name).toBe("New Name");
    });

    it("rejects empty rename", async () => {
      const id = await collectionsService.createCollection("Valid Name");

      await expect(
        collectionsService.renameCollection(id, "  "),
      ).rejects.toThrow(/required/i);
    });
  });

  describe("deleteCollection", () => {
    it("removes the collection", async () => {
      const id = await collectionsService.createCollection("To Delete");

      await collectionsService.deleteCollection(id);

      expect(await collectionRepository.getById(id)).toBeUndefined();
    });
  });

  describe("listCollections", () => {
    it("returns collections sorted A–Z case-insensitively", async () => {
      await collectionsService.createCollection("beta");
      await collectionsService.createCollection("Alpha");
      await collectionsService.createCollection("gamma");

      const list = await collectionsService.listCollections();

      expect(list.map((c) => c.name)).toEqual(["Alpha", "beta", "gamma"]);
    });
  });

  describe("addMediaToCollection", () => {
    it("adds media and returns ok", async () => {
      const collectionId = await collectionsService.createCollection("List");
      const mediaId = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "Test Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await collectionsService.addMediaToCollection(
        collectionId,
        mediaId,
      );

      expect(result).toEqual({ ok: true });

      const memberships =
        await collectionRepository.getMembershipsByCollection(collectionId);
      expect(memberships).toHaveLength(1);
      expect(memberships[0].mediaId).toBe(mediaId);
    });

    it("returns duplicate for existing membership", async () => {
      const collectionId = await collectionsService.createCollection("List");
      const mediaId = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "Test Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await collectionsService.addMediaToCollection(collectionId, mediaId);
      const second = await collectionsService.addMediaToCollection(
        collectionId,
        mediaId,
      );

      expect(second).toEqual({ ok: false, reason: "duplicate" });
    });

    it("returns collection-missing when collection does not exist", async () => {
      const mediaId = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "Test Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await collectionsService.addMediaToCollection(
        9999,
        mediaId,
      );

      expect(result).toEqual({ ok: false, reason: "collection-missing" });
    });

    it("returns media-missing when media does not exist", async () => {
      const collectionId = await collectionsService.createCollection("List");

      const result = await collectionsService.addMediaToCollection(
        collectionId,
        9999,
      );

      expect(result).toEqual({ ok: false, reason: "media-missing" });
    });
  });

  describe("removeMediaFromCollection", () => {
    it("removes the membership", async () => {
      const collectionId = await collectionsService.createCollection("List");
      const mediaId = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "Test Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await collectionsService.addMediaToCollection(collectionId, mediaId);
      await collectionsService.removeMediaFromCollection(collectionId, mediaId);

      const memberships =
        await collectionRepository.getMembershipsByCollection(collectionId);
      expect(memberships).toHaveLength(0);
    });
  });

  describe("getCollectionWithMedia", () => {
    it("joins memberships to media", async () => {
      const collectionId =
        await collectionsService.createCollection("Favorites");
      const mediaId = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "Test Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await collectionsService.addMediaToCollection(collectionId, mediaId);

      const result = await collectionsService.getCollectionWithMedia(
        collectionId,
      );

      expect(result).not.toBeNull();
      expect(result?.collection.name).toBe("Favorites");
      expect(result?.media).toHaveLength(1);
      expect(result?.media[0].id).toBe(mediaId);
    });

    it("returns null for missing collection", async () => {
      const result = await collectionsService.getCollectionWithMedia(9999);
      expect(result).toBeNull();
    });
  });

  describe("getCollectionsForMedia", () => {
    it("returns collections containing the media", async () => {
      const first = await collectionsService.createCollection("First");
      const second = await collectionsService.createCollection("Second");
      const mediaId = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "Test Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await collectionsService.addMediaToCollection(first, mediaId);
      await collectionsService.addMediaToCollection(second, mediaId);

      const result = await collectionsService.getCollectionsForMedia(mediaId);

      expect(result).toHaveLength(2);
    });
  });

  describe("listLibraryMediaForPicker", () => {
    it("excludes current members", async () => {
      const collectionId = await collectionsService.createCollection("List");
      const first = await mediaRepository.add({
        tmdbId: 100,
        mediaType: "tv",
        title: "First Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const second = await mediaRepository.add({
        tmdbId: 200,
        mediaType: "tv",
        title: "Second Show",
        userStatus: "watching",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await collectionsService.addMediaToCollection(collectionId, first);

      const picker = await collectionsService.listLibraryMediaForPicker(
        collectionId,
      );

      expect(picker.map((m) => m.id)).toContain(second);
      expect(picker.map((m) => m.id)).not.toContain(first);
    });
  });
});