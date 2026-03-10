from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.family_doctor.router import router as doctor_router
from app.family_doctor.scraper import scrape_doctor_schedules

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动：注册定时爬虫任务
    if settings.SCRAPER_ENABLED:
        scheduler.add_job(
            scrape_doctor_schedules,
            "interval",
            hours=settings.SCRAPER_INTERVAL_HOURS,
            id="doctor_scraper",
            replace_existing=True,
        )
        scheduler.start()
    yield
    # 关闭
    if scheduler.running:
        scheduler.shutdown()


app = FastAPI(
    title="Family Manager API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册模块路由
app.include_router(doctor_router, prefix="/api/doctor", tags=["家庭医生"])


@app.get("/health")
async def health():
    return {"status": "ok"}
