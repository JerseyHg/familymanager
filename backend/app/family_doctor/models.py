from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DoctorSchedule(Base):
    """医生排班号源信息"""

    __tablename__ = "doctor_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 医生信息
    doctor_name: Mapped[str] = mapped_column(String(50), index=True)
    positional_titles: Mapped[str | None] = mapped_column(String(50))

    # 科室信息
    dept_code: Mapped[str] = mapped_column(String(20))
    dept_name: Mapped[str | None] = mapped_column(String(100))

    # 医院信息
    hospital_name: Mapped[str] = mapped_column(String(100), default="武汉协和医院")

    # 排班信息
    out_call_date: Mapped[str] = mapped_column(String(20), index=True)
    time_interval_name: Mapped[str | None] = mapped_column(String(20))

    # 号源信息
    available_remain_num: Mapped[int] = mapped_column(Integer, default=0)
    available_total_num: Mapped[int] = mapped_column(Integer, default=0)
    schedule_status: Mapped[int] = mapped_column(Integer, default=0)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
