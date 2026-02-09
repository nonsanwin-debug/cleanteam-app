-- Allow workers to DELETE photos if they are assigned to the site
CREATE POLICY "Worker Delete Photos" ON public.photos
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.sites
            WHERE sites.id = photos.site_id
            AND sites.worker_id = auth.uid()
        )
    );

-- Allow workers to DELETE files from storage "site-photos"
-- Note: Storage policies are on storage.objects
-- We assume the path is "siteId/..." and check checking ownership via siteId in path is hard in SQL for storage.
-- Simplified: Allow authenticated users to delete from 'site-photos' bucket if they are the uploader?
-- Or just allow authenticated users to delete?
-- "Give full delete access to authenticated users for site-photos bucket" is risky but practical if we trust workers.
-- Or better: matching the folder prefix "siteId/" to a site they own.
-- Pattern: site-photos/{siteId}/{type}/{filename}
-- split_part(name, '/', 1) = siteId

CREATE POLICY "Worker Delete Storage" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'site-photos'
        AND EXISTS (
             SELECT 1 FROM public.sites
             WHERE sites.id = (storage.objects.path_tokens)[1]::uuid
             AND sites.worker_id = auth.uid()
        )
    );

NOTIFY pgrst, 'reload config';
