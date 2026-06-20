"use client";

import Image from "next/image";
import { ImageIcon, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GalleryImage } from "@/components/image-gallery/types";

type ImageGridProps = {
  images: GalleryImage[];
  deletingId: string | null;
  onDelete: (image: GalleryImage) => Promise<void>;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageGrid({
  images,
  deletingId,
  onDelete,
}: ImageGridProps) {
  if (images.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-background p-8 text-center shadow-sm">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <ImageIcon className="size-5 text-muted-foreground" />
        </div>
        <h2 className="font-semibold">Your vault is empty</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Choose an image above to add your first private file.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => (
        <article
          key={image.id}
          className="group overflow-hidden rounded-2xl border bg-background shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-square bg-muted">
            <Image
              src={image.signedUrl}
              alt={image.original_name}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {image.original_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(image.size_bytes)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={deletingId !== null}
              onClick={() => void onDelete(image)}
              aria-label={`Delete ${image.original_name}`}
            >
              <Trash2 />
              <span className="hidden sm:inline">
                {deletingId === image.id ? "Deleting…" : "Delete"}
              </span>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
