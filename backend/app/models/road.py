"""Road model with PostGIS geometry."""
import enum
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.core.database import Base


class RoadStatus(str, enum.Enum):
    OPEN = "OPEN"
    AT_RISK = "AT_RISK"
    BLOCKED = "BLOCKED"


class Road(Base):
    __tablename__ = "roads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    road_name: Mapped[str] = mapped_column(String(100))
    road_type: Mapped[str] = mapped_column(String(50), default="secondary")
    geometry = mapped_column(Geometry("LINESTRING", srid=4326), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=RoadStatus.OPEN.value)
