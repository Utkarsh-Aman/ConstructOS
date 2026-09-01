import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    url = os.getenv("DATABASE_URL")
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql+asyncpg://", "postgresql://")
        
    print("Connecting to database...")
    conn = await asyncpg.connect(url)
    
    try:
        print("Adding columns...")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;")
        await conn.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT;")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
