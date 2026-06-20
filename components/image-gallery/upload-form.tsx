"use client";

import { FormEvent, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-dashed bg-muted/30 p-4">
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          disabled={isUploading}
          className="h-11 bg-background"
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
      <Button
        type="submit"
        className="w-full sm:w-fit"
        disabled={isUploading || !selectedFile}
      >
        <UploadCloud />
        {isUploading ? "Uploading…" : "Upload selected image"}
      </Button>
    </form>
  );
}
