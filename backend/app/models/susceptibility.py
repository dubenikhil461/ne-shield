"""Susceptibility zone model - application representation of AI/ML output."""
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.core.database import Base


class SusceptibilityZone(Base):
    __tablename__ = "susceptibility_zones"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    zone_code: Mapped[str] = mapped_column(String(50), index=True)
    susceptibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    geometry = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="demo")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
