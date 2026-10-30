-- Private bucket for original resume files. Applied to the Supabase project directly
-- (Prisma migrations can't see the storage schema). No policies: only the server's secret
-- key and one-time signed upload URLs can reach it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 5242880,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
