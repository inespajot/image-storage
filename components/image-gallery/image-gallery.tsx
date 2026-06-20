"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, LockKeyhole, UploadCloud } from "lucide-react";

import { ImageGrid } from "@/components/image-gallery/image-grid";
import type {
  GalleryImage,
  ImageRecord,
} from "@/components/image-gallery/types";
import { UploadForm } from "@/components/image-gallery/upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage(null);

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
    setSuccessMessage(null);

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
      setSuccessMessage(`${file.name} was uploaded successfully.`);
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
    setSuccessMessage(null);

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
      setSuccessMessage(`${image.original_name} was deleted.`);
    } catch (deleteError) {
      setErrorMessage(getErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="flex w-full flex-1 flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <LockKeyhole className="size-3.5" />
            Private account storage
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your image vault
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Upload and manage images that are only accessible through your
            signed-in account.
          </p>
        </div>
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {images.length} {images.length === 1 ? "image" : "images"}
          </p>
        )}
      </header>

      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UploadCloud className="size-4" />
            </div>
            <div>
              <CardTitle>Upload an image</CardTitle>
              <CardDescription className="mt-1">
                Select an image file from your device. It will be stored
                privately in your vault.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UploadForm isUploading={isUploading} onUpload={handleUpload} />
        </CardContent>
      </Card>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="aspect-square animate-pulse rounded-2xl border bg-muted"
            />
          ))}
        </div>
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
