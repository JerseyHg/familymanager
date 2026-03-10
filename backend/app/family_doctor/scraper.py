import logging
from datetime import datetime

import httpx
from sqlalchemy import select

from app.database import async_session
from app.family_doctor.models import DoctorSchedule

logger = logging.getLogger(__name__)

# ========== 爬虫配置 ==========
API_URL = "https://www.whuh.com/system/resource/hzkj/new/getRosteringInfo.jsp"
DEPT_CODE = "136"  # 疼痛科门诊（糖尿病周围神经病专区）
QY = "1"  # 主院区
WATCH_DOCTORS: list[str] = ["张小洺", "杨东"]  # 留空则监控全部

PAGE_URL = "https://www.whuh.com/yygh/ysxz.jsp?urltype=tree.TreeTempUrl&wbtreeid=18781"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://www.whuh.com/yygh/ysxz.jsp?urltype=tree.TreeTempUrl&wbtreeid=18781",
    "Origin": "https://www.whuh.com",
}

# 爬虫运行状态
scraper_status = {
    "last_run": None,
    "last_status": "idle",
    "last_count": 0,
    "running": False,
}


async def scrape_doctor_schedules():
    """抓取协和医院排班号源信息并存入数据库"""
    if scraper_status["running"]:
        logger.warning("爬虫正在运行中，跳过本次执行")
        return

    scraper_status["running"] = True
    scraper_status["last_status"] = "running"
    today = datetime.now().strftime("%Y-%m-%d")

    payload = {
        "docid": "",
        "zsid": DEPT_CODE,
        "qy": QY,
        "start_time": today,
        "end_time": today,
        "afterDays": "14",
    }

    try:
        async with httpx.AsyncClient(timeout=15, headers=HEADERS, follow_redirects=True) as client:
            # 先访问页面获取 session cookie
            await client.get(PAGE_URL)
            # 再请求排班数据
            resp = await client.post(
                API_URL,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            result = resp.json()

        if result.get("code") != 1001:
            logger.warning("接口返回异常: %s", result.get("msg"))
            scraper_status["last_status"] = f"error: {result.get('msg')}"
            return

        schedule_list = result.get("data", [])
        saved_count = 0

        async with async_session() as session:
            for item in schedule_list:
                doc_name = item.get("doctor_name", "")

                # 过滤医生
                if WATCH_DOCTORS and doc_name not in WATCH_DOCTORS:
                    continue

                out_call_date = item.get("out_call_date", "")
                time_interval = item.get("time_interval_name", "")

                # 查找已有记录（按医生+日期+时段去重）
                stmt = select(DoctorSchedule).where(
                    DoctorSchedule.doctor_name == doc_name,
                    DoctorSchedule.out_call_date == out_call_date,
                    DoctorSchedule.time_interval_name == time_interval,
                    DoctorSchedule.dept_code == DEPT_CODE,
                )
                existing = (await session.execute(stmt)).scalar_one_or_none()

                if existing:
                    # 更新已有记录
                    existing.available_remain_num = item.get("available_remain_num", 0)
                    existing.available_total_num = item.get("available_total_num", 0)
                    existing.schedule_status = item.get("schedule_status", 0)
                    existing.positional_titles = item.get("positional_titles", "")
                    existing.updated_at = datetime.now()
                else:
                    # 插入新记录
                    schedule = DoctorSchedule(
                        doctor_name=doc_name,
                        positional_titles=item.get("positional_titles", ""),
                        dept_code=DEPT_CODE,
                        dept_name="疼痛科门诊",
                        hospital_name="武汉协和医院",
                        out_call_date=out_call_date,
                        time_interval_name=time_interval,
                        available_remain_num=item.get("available_remain_num", 0),
                        available_total_num=item.get("available_total_num", 0),
                        schedule_status=item.get("schedule_status", 0),
                    )
                    session.add(schedule)

                saved_count += 1

            await session.commit()

        logger.info("爬取成功，处理 %d 条排班记录", saved_count)
        scraper_status["last_status"] = "success"
        scraper_status["last_count"] = saved_count

    except Exception as e:
        logger.error("爬虫执行失败: %s", e)
        scraper_status["last_status"] = f"error: {e}"
    finally:
        scraper_status["running"] = False
        scraper_status["last_run"] = datetime.now().isoformat()
