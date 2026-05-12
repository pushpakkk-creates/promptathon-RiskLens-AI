from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import contracts
from app.routes import dashboard

app = FastAPI(
    title="RiskLens AI",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    contracts.router,
    prefix="/contracts",
    tags=["Contracts"]
)

app.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"]
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def health_check():
    return {"message": "RiskLens-AI backend running"}
