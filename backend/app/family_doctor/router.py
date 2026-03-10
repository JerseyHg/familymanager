import asyncio

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.deps import get_db
from app.family_doctor.crud import get_schedules
from app.family_doctor.schemas import (
    DoctorScheduleListOut,
    ScraperStatusOut,
)
from app.family_doctor.scraper import (
    get_cookie_status,
    scrape_doctor_schedules,
    scraper_status,
    set_cookie,
)

router = APIRouter()


class CookieInput(BaseModel):
    jsessionid: str


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
    cookie = get_cookie_status()
    if not cookie["has_cookie"]:
        return {"message": "请先设置登录 Cookie"}
    asyncio.create_task(scrape_doctor_schedules())
    return {"message": "爬虫已启动"}


@router.get("/scraper/status", response_model=ScraperStatusOut)
async def get_scraper_status():
    """获取爬虫运行状态"""
    return ScraperStatusOut(**scraper_status)


@router.post("/cookie")
async def update_cookie(data: CookieInput):
    """设置医院登录 Cookie"""
    set_cookie(data.jsessionid)
    return {"message": "Cookie 已更新"}


@router.get("/cookie/status")
async def cookie_status():
    """获取 Cookie 状态"""
    return get_cookie_status()
