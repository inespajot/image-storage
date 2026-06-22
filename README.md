# Private Image Vault

A small full-stack image storage web app built with Next.js and Supabase. Users can create accounts, log in, upload images, and view only the images that belong to their own account. The goal is to demonstrate a clean authentication and data-isolation flow, where each user’s uploaded images are kept private from every other user.

## Live Demo

Deployed on Vercel:

```txt
https://image-storage-delta.vercel.app
```

## Features

* User sign up and login with Supabase Auth
* Protected image gallery page for logged-in users
* Image-only file uploads
* Private Supabase Storage bucket
* User-specific file paths using the logged-in user’s ID
* Metadata stored in a Postgres `images` table
* Row Level Security policies to isolate users’ data
* Temporary signed URLs for displaying private images
* Delete functionality for both the image file and its metadata row
* Deployed through Vercel from GitHub

## Tech Stack

* **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
* **Backend/Auth/Storage:** Supabase
* **Database:** Supabase Postgres
* **Deployment:** Vercel
* **Version Control:** Git and GitHub

## How the App Works

The app uses Supabase for three main backend services:

1. **Authentication**
   Users sign up and log in using Supabase Auth. Once logged in, the app can access the current user through Supabase’s session.

2. **Database**
   Each uploaded image has a metadata row in the `public.images` table. This row stores information such as the file path, original file name, file type, file size, and the `owner_id` of the user who uploaded it.

3. **Storage**
   The actual image files are stored in a private Supabase Storage bucket called `user-images`.

When a user uploads an image, the app stores it under a path like:

```txt
{user.id}/{randomUUID}.{extension}
```

For example:

```txt
3d9f...a21/image-uuid.png
```

This means each user’s files are placed inside a folder named after their Supabase user ID.

## Account Isolation

The key security idea is that account isolation is enforced by Supabase, not just by the frontend.

The app uses two layers of isolation:

### 1. Database Isolation

The `images` table has an `owner_id` column. Row Level Security ensures that users can only access rows where:

```sql
owner_id = auth.uid()
```

So even if a user tried to manually request another user’s image metadata, Supabase would block it.

### 2. Storage Isolation

Image files are stored in folders named after the user ID. Supabase Storage policies check that the first folder in the file path matches the logged-in user:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

So users can only upload, read, or delete files inside their own folder.

## Why the Bucket Is Private

The `user-images` bucket is private. This means uploaded images are not publicly accessible through permanent public URLs.

Instead, the app creates temporary signed URLs for the images that belong to the logged-in user. These URLs expire after a short period of time.

This demonstrates a safer pattern than making all uploaded files public.

## Database Schema

The main metadata table is:

```sql
create table public.images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'user-images',
  storage_path text not null,
  original_name text,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
```

## Supabase Setup

The project uses:

* A private Storage bucket called `user-images`
* A `public.images` table
* Row Level Security on `public.images`
* Storage policies on `storage.objects`

Core policy idea:

```sql
auth.uid() = owner_id
```

for database rows, and:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

for stored files.

## Environment Variables

This app requires environment variables to run. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=(contact-me)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(contact-me)
```
These are also added to Vercel as environment variables for production deployment.

`.env.local` should never be committed GitHub.

## Running Locally

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the app locally:

```txt
http://localhost:3000
```

## Deployment

The app is deployed through Vercel.

The deployment flow is:

```txt
Local code changes
→ Git commit
→ Push to GitHub
→ Vercel automatically builds and deploys
```

The Vercel project uses the same Supabase environment variables as the local app.

Supabase Auth also needs the deployed Vercel URL added to the allowed site and redirect URLs.

## Project Structure

```txt
app/
  protected/
    page.tsx
    layout.tsx

components/
  image-gallery/
    image-gallery.tsx
    upload-form.tsx
    image-grid.tsx
    types.ts

utils/
  supabase/
    client.ts
    server.ts
    middleware.ts
```

## Main Files

### `app/protected/page.tsx`

Protected page that renders the image gallery for logged-in users.

### `components/image-gallery/image-gallery.tsx`

Handles the main gallery logic:

* gets the logged-in user
* loads the current user’s images
* creates signed URLs
* uploads images
* inserts metadata rows
* deletes images and metadata
* displays errors

### `components/image-gallery/upload-form.tsx`

Simple upload UI that only accepts image files.

### `components/image-gallery/image-grid.tsx`

Displays private images in a responsive grid and provides delete controls.

### `components/image-gallery/types.ts`

Defines TypeScript types for image metadata and gallery state.

## Security Notes

* No Supabase service-role key is used in the frontend.
* The app relies on the logged-in user’s Supabase session.
* The Storage bucket is private.
* Images are shown through signed URLs.
* RLS policies enforce user ownership on the backend.
* Frontend filtering improves user experience, but backend policies provide the actual security.
