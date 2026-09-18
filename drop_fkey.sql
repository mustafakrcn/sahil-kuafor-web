-- Drop the foreign key constraint that requires profile.id to exist in auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
