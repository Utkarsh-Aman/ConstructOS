from supabase import create_client, Client, ClientOptions
from app.core.config import get_settings

settings = get_settings()

# Anon client — used for operations that respect RLS
supabase_anon: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Service-role client — bypasses RLS; use ONLY server-side, never expose to client
# The service_role key should bypass RLS automatically.
# We set schema to 'public' explicitly for clarity.
supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
    options=ClientOptions(
        postgrest_client_timeout=30,
        schema="public",
    )
)
