# Private Image Storage App

A full-stack image storage app built with Next.js and Supabase. Users sign up, log in, and upload images that only they can see — the project is a demonstration of clean authentication and data isolation, where every user's uploads are kept private from everyone else.

## Live Demo

```txt
https://image-storage-delta.vercel.app
```

## Features

* Sign up / login via Supabase Auth
* Protected gallery page for logged-in users
* Image-only uploads
* Private Supabase Storage bucket, scoped per user
* Metadata stored in a Postgres `images` table
* Row Level Security to isolate user data at the database level
* Temporary signed URLs for displaying private images
* Delete support (removes both the file and its metadata row)
* Deployed via Vercel from GitHub

## Tech Stack

* **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
* **Backend/Auth/Storage:** Supabase (Postgres + Auth + Storage)
* **Deployment:** Vercel

## How It Works

Supabase handles authentication, the database, and file storage. Once a user logs in, Supabase Auth gives the app access to their session. Every image they upload gets a metadata row in `public.images` — file path, name, type, size, and an `owner_id` linking it back to them — while the actual file goes into a private Storage bucket called `user-images`, saved under a path scoped to their user ID:

```txt
{user.id}/{randomUUID}.{extension}
```
So a real path might look like `3d9f...a21/image-uuid.png`.

## Account Isolation

Isolation is enforced by Supabase itself, not just hidden by frontend logic — so even a user poking at the API directly can't reach anyone else's data.

**Database:** Row Level Security on `public.images` restricts access to rows where `owner_id = auth.uid()`.

**Storage:** a policy on `storage.objects` checks that the first folder in a file's path matches the logged-in user:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Together, these mean a user can only read, upload to, or delete from their own folder and their own rows — full stop, regardless of what the frontend does or does not show them.

## Why the Bucket Is Private

`user-images` isn't publicly readable. Instead of permanent public URLs, the app generates short-lived signed URLs for each image when a logged-in user's gallery loads. It's a safer default than making uploaded files public by default, and it means access always flows through an authenticated session.

## Database Schema

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

## Environment Variables

Create a `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=(contact-me)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(contact-me)
```

Add the same variables to Vercel for production. Never commit `.env.local`.

## Running Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deployment

Pushing to GitHub triggers an automatic build and deploy on Vercel, using the same Supabase environment variables as local dev. Don't forget to add the deployed Vercel URL to Supabase Auth's allowed site and redirect URLs, or login will fail in production.

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

**`app/protected/page.tsx`** — the protected gallery page.

**`components/image-gallery/image-gallery.tsx`** — the core logic: fetches the user, loads their images, generates signed URLs, handles uploads/deletes, and surfaces errors.

**`components/image-gallery/upload-form.tsx`** — upload UI, restricted to image files.

**`components/image-gallery/image-grid.tsx`** — responsive grid with delete controls.

**`components/image-gallery/types.ts`** — shared TypeScript types for images and gallery state.

## Security Notes

No service-role key ever touches the frontend — everything runs off the user's own Supabase session. The real security boundary is Row Level Security and the storage policies on the backend; the frontend's filtering is just for a smoother UX, not the thing actually keeping data private.
