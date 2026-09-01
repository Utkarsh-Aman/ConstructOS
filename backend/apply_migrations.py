import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL not found in .env")
        return
        
    # asyncpg expects postgresql:// instead of postgresql+asyncpg://
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        
    print("Connecting to database...")
    conn = await asyncpg.connect(url)
    
    files = [
        "supabase/migrations/001_initial_schema.sql",
        "supabase/migrations/002_pgvector_rpc.sql"
    ]
    
    try:
        for f in files:
            print(f"Applying {f}...")
            with open(f, "r", encoding="utf-8") as file:
                sql = file.read()
                await conn.execute(sql)
            print(f"Successfully applied {f}")
            
    except Exception as e:
        print(f"Error executing migration: {e}")
    finally:
        await conn.close()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
