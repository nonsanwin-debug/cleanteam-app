-- Add template_id to sites table
ALTER TABLE public.sites 
ADD COLUMN template_id UUID REFERENCES public.checklist_templates(id);

-- Optional: Set a default template if any exist (manual run required if needed)
-- UPDATE public.sites SET template_id = (SELECT id FROM public.checklist_templates LIMIT 1) WHERE template_id IS NULL;
