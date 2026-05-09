from app.database import engine, Base
from app.models.contract import Contract

Base.metadata.create_all(bind=engine)

print("Tables created successfully!")