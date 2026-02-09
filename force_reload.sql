CREATE TABLE public.cache_buster (id serial primary key);
DROP TABLE public.cache_buster;
NOTIFY pgrst, 'reload config';
