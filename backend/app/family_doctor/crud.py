from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.family_doctor.models import DoctorSchedule


async def get_schedules(
    db: AsyncSession,
    doctor_name: str | None = None,
    date: str | None = None,
    status: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[DoctorSchedule], int]:
    """查询排班列表，支持过滤"""
    stmt = select(DoctorSchedule)
    count_stmt = select(func.count()).select_from(DoctorSchedule)

    if doctor_name:
        stmt = stmt.where(DoctorSchedule.doctor_name.contains(doctor_name))
        count_stmt = count_stmt.where(DoctorSchedule.doctor_name.contains(doctor_name))
    if date:
        stmt = stmt.where(DoctorSchedule.out_call_date == date)
        count_stmt = count_stmt.where(DoctorSchedule.out_call_date == date)
    if status is not None:
        stmt = stmt.where(DoctorSchedule.schedule_status == status)
        count_stmt = count_stmt.where(DoctorSchedule.schedule_status == status)

    stmt = stmt.order_by(
        DoctorSchedule.out_call_date.desc(), DoctorSchedule.doctor_name
    ).offset(skip).limit(limit)

    result = await db.execute(stmt)
    total = await db.scalar(count_stmt)
    return list(result.scalars().all()), total or 0
