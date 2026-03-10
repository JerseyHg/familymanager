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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": "https://www.whuh.com/yygh/ysxz.jsp?urltype=tree.TreeTempUrl&wbtreeid=18781",
    "Origin": "https://www.whuh.com",
}

# 存储用户提供的登录 Cookie
auth_cookie: dict = {
    "JSESSIONID": "",
    "updated_at": None,
}

# 爬虫运行状态
scraper_status = {
    "last_run": None,
    "last_status": "idle",
    "last_count": 0,
    "running": False,
}


def set_cookie(jsessionid: str):
    """更新登录 Cookie"""
    auth_cookie["JSESSIONID"] = jsessionid
    auth_cookie["updated_at"] = datetime.now().isoformat()


def get_cookie_status() -> dict:
    """获取 Cookie 状态"""
    return {
        "has_cookie": bool(auth_cookie["JSESSIONID"]),
        "updated_at": auth_cookie["updated_at"],
    }


async def scrape_doctor_schedules():
    """抓取协和医院排班号源信息并存入数据库"""
    if scraper_status["running"]:
        logger.warning("爬虫正在运行中，跳过本次执行")
        return

    if not auth_cookie["JSESSIONID"]:
        scraper_status["last_status"] = "error: 未设置登录 Cookie，请先在设置页面配置"
        scraper_status["last_run"] = datetime.now().isoformat()
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
        cookies = {"JSESSIONID": auth_cookie["JSESSIONID"]}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                API_URL, data=payload, headers=HEADERS, cookies=cookies
            )
            resp.raise_for_status()
            result = resp.json()

        if result.get("code") != 1001:
            msg = result.get("msg", "未知错误")
            logger.warning("接口返回异常: %s", msg)
            scraper_status["last_status"] = f"error: {msg}"
            if "登录" in msg:
                scraper_status["last_status"] += "（Cookie 已过期，请重新设置）"
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
                    existing.available_remain_num = item.get("available_remain_num", 0)
                    existing.available_total_num = item.get("available_total_num", 0)
                    existing.schedule_status = item.get("schedule_status", 0)
                    existing.positional_titles = item.get("positional_titles", "")
                    existing.updated_at = datetime.now()
                else:
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
