import asyncio

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.deps import get_db
from app.family_doctor.crud import get_schedules
from app.family_doctor.schemas import (
    DoctorScheduleListOut,
    ScraperStatusOut,
)
from app.family_doctor.scraper import scrape_doctor_schedules, scraper_status

router = APIRouter()


@router.get("/schedules", response_model=DoctorScheduleListOut)
async def list_schedules(
    doctor_name: str | None = Query(None, description="医生姓名"),
    date: str | None = Query(None, description="日期 YYYY-MM-DD"),
    status: int | None = Query(None, description="状态: 1=有号 0=无号"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """获取医生排班列表"""
    items, total = await get_schedules(
        db, doctor_name=doctor_name, date=date, status=status, skip=skip, limit=limit
    )
    return DoctorScheduleListOut(total=total, items=items)


@router.post("/scraper/run")
async def run_scraper():
    """手动触发爬虫"""
    if scraper_status["running"]:
        return {"message": "爬虫正在运行中，请稍后再试"}
    asyncio.create_task(scrape_doctor_schedules())
    return {"message": "爬虫已启动"}


@router.get("/scraper/status", response_model=ScraperStatusOut)
async def get_scraper_status():
    """获取爬虫运行状态"""
    return ScraperStatusOut(**scraper_status)
