from app.db.supabase_client import supabase_admin
try:
    print("Creating bucket master-plans...")
    supabase_admin.storage.create_bucket("master-plans")
    print("Bucket created successfully!")
except Exception as e:
    print("Error or already exists:", e)
