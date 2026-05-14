from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS ambiguity_findings JSONB"))
    conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS ambiguity_risk_level VARCHAR"))
    conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_ambiguities INTEGER"))
    conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS executive_summary TEXT"))
    conn.commit()
    print("Migration complete!")