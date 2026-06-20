export type ImageRecord = {
  id: string;
  owner_id: string;
  bucket_id: string;
  storage_path: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type GalleryImage = ImageRecord & {
  signedUrl: string;
};
