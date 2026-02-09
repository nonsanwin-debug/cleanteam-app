DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find all check constraints on 'photos' table that involve the column 'type'
    FOR r IN
        SELECT con.conname
        FROM pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'photos'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%type%'
    LOOP
        -- Drop the constraint
        EXECUTE 'ALTER TABLE photos DROP CONSTRAINT ' || quote_ident(r.conname);
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;

    -- Add the updated constraint including 'special'
    EXECUTE 'ALTER TABLE photos ADD CONSTRAINT photos_type_check CHECK (type IN (''before'', ''during'', ''after'', ''special''))';
    RAISE NOTICE 'Added updated constraint photos_type_check';
END $$;
