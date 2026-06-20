"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";

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
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No images uploaded yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => (
        <article key={image.id} className="overflow-hidden rounded-lg border">
          <div className="relative aspect-square bg-muted">
            <Image
              src={image.signedUrl}
              alt={image.original_name}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          <div className="flex items-center gap-3 p-3">
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
              variant="destructive"
              size="icon"
              disabled={deletingId !== null}
              onClick={() => void onDelete(image)}
              aria-label={`Delete ${image.original_name}`}
            >
              <Trash2 />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
