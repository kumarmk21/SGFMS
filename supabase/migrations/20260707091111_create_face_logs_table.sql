/*
# Create face_logs table for face recognition monitoring

## Summary
Adds a `face_logs` table to store records of faces detected by the always-on entrance camera.
Each row represents one auto-capture event: who was logged, how many faces were visible,
confidence score of the best detection, and the captured frame as a base64 data URL.

## New Tables

### face_logs
- `id` (uuid, primary key) — unique log entry
- `captured_at` (timestamptz, default now()) — when the face was detected and captured
- `photo_url` (text, nullable) — base64 JPEG data URL of the captured frame
- `face_count` (integer, default 1) — number of faces detected in the frame
- `confidence` (float, nullable) — detection confidence score 0–1 of the primary face
- `camera_label` (text, nullable) — optional label for which camera/location
- `logged_by` (uuid, nullable, FK → auth.users) — the receptionist who had the monitor open
- `created_at` (timestamptz, default now())

## Security
- RLS enabled.
- `authenticated` users (receptionists/admins) can SELECT, INSERT; no UPDATE or DELETE from client.
  This preserves the audit-trail integrity — captured logs cannot be edited or removed.

## Notes
1. The photo_url stores the raw base64 JPEG directly to avoid requiring a storage bucket setup.
2. Indexed on `captured_at DESC` for efficient recent-first queries on the monitor page.
3. No UPDATE or DELETE policies are intentional — face logs are an immutable audit trail.
*/

CREATE TABLE IF NOT EXISTS face_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  photo_url text,
  face_count integer NOT NULL DEFAULT 1,
  confidence float,
  camera_label text,
  logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS face_logs_captured_at_idx ON face_logs (captured_at DESC);
CREATE INDEX IF NOT EXISTS face_logs_logged_by_idx ON face_logs (logged_by);

ALTER TABLE face_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_face_logs" ON face_logs;
CREATE POLICY "authenticated_select_face_logs" ON face_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_face_logs" ON face_logs;
CREATE POLICY "authenticated_insert_face_logs" ON face_logs FOR INSERT
  TO authenticated WITH CHECK (true);
