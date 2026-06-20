"use client";

import { FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UploadFormProps = {
  isUploading: boolean;
  onUpload: (file: File) => Promise<boolean>;
};

export function UploadForm({ isUploading, onUpload }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (!selectedFile) {
      setValidationError("Choose an image to upload.");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setValidationError("Only image files can be uploaded.");
      return;
    }

    const didUpload = await onUpload(selectedFile);

    if (didUpload) {
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start"
      onSubmit={handleSubmit}
    >
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file);
            setValidationError(
              file && !file.type.startsWith("image/")
                ? "Only image files can be uploaded."
                : null,
            );
          }}
          aria-describedby={validationError ? "upload-validation-error" : undefined}
        />
        {validationError && (
          <p
            id="upload-validation-error"
            className="mt-2 text-sm text-destructive"
          >
            {validationError}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isUploading || !selectedFile}>
        {isUploading ? "Uploading…" : "Upload image"}
      </Button>
    </form>
  );
}
