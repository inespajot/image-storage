"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { ImageGrid } from "@/components/image-gallery/image-grid";
import type {
  GalleryImage,
  ImageRecord,
} from "@/components/image-gallery/types";
import { UploadForm } from "@/components/image-gallery/upload-form";
import { createClient } from "@/lib/supabase/client";

const BUCKET_ID = "user-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/webp": "webp",
};

function getFileExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();

  if (nameExtension && /^[a-z0-9]{1,10}$/.test(nameExtension)) {
    return nameExtension;
  }

  return MIME_EXTENSIONS[file.type] ?? null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function ImageGallery() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadImages = useCallback(
    async (currentUser: User) => {
      const { data, error } = await supabase
        .from("images")
        .select(
          "id, owner_id, bucket_id, storage_path, original_name, content_type, size_bytes, created_at",
        )
        .eq("owner_id", currentUser.id)
        .eq("bucket_id", BUCKET_ID)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Could not load your images: ${error.message}`);
      }

      const records = (data ?? []) as ImageRecord[];
      const imagesWithUrls = await Promise.all(
        records.map(async (record) => {
          const { data: signedUrlData, error: signedUrlError } =
            await supabase.storage
              .from(BUCKET_ID)
              .createSignedUrl(record.storage_path, SIGNED_URL_TTL_SECONDS);

          if (signedUrlError) {
            throw new Error(
              `Could not create a link for ${record.original_name}: ${signedUrlError.message}`,
            );
          }

          return { ...record, signedUrl: signedUrlData.signedUrl };
        }),
      );

      setImages(imagesWithUrls);
    },
    [supabase],
  );

  useEffect(() => {
    let isActive = true;

    async function initializeGallery() {
      setIsLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase.auth.getUser();

      if (!isActive) return;

      if (error || !data.user) {
        router.replace("/auth/login");
        return;
      }

      setUser(data.user);

      try {
        await loadImages(data.user);
      } catch (loadError) {
        if (isActive) {
          setErrorMessage(getErrorMessage(loadError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void initializeGallery();

    return () => {
      isActive = false;
    };
  }, [loadImages, router, supabase]);

  async function handleUpload(file: File) {
    if (!user) {
      setErrorMessage("Your session has expired. Please sign in again.");
      return false;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Only image files can be uploaded.");
      return false;
    }

    const extension = getFileExtension(file);
    if (!extension) {
      setErrorMessage("The selected image must have a valid file extension.");
      return false;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_ID)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { error: insertError } = await supabase.from("images").insert({
        owner_id: user.id,
        bucket_id: BUCKET_ID,
        storage_path: storagePath,
        original_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
      });

      if (insertError) {
        await supabase.storage.from(BUCKET_ID).remove([storagePath]);
        throw new Error(`Could not save image metadata: ${insertError.message}`);
      }

      await loadImages(user);
      return true;
    } catch (uploadError) {
      setErrorMessage(getErrorMessage(uploadError));
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(image: GalleryImage) {
    if (!user || image.owner_id !== user.id) {
      setErrorMessage("You cannot delete this image.");
      return;
    }

    setDeletingId(image.id);
    setErrorMessage(null);

    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_ID)
        .remove([image.storage_path]);

      if (storageError) {
        throw new Error(`Could not delete the image file: ${storageError.message}`);
      }

      const { error: metadataError } = await supabase
        .from("images")
        .delete()
        .eq("id", image.id)
        .eq("owner_id", user.id)
        .eq("bucket_id", BUCKET_ID);

      if (metadataError) {
        throw new Error(
          `The file was deleted, but its metadata could not be removed: ${metadataError.message}`,
        );
      }

      setImages((currentImages) =>
        currentImages.filter((currentImage) => currentImage.id !== image.id),
      );
    } catch (deleteError) {
      setErrorMessage(getErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your images</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Images are private and only available to your account.
        </p>
      </header>

      <UploadForm isUploading={isUploading} onUpload={handleUpload} />

      {errorMessage && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your images…</p>
      ) : (
        <ImageGrid
          images={images}
          deletingId={deletingId}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
