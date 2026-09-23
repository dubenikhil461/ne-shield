"""Village model with PostGIS geometry."""
from sqlalchemy import String, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.core.database import Base


class Village(Base):
    __tablename__ = "villages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    population: Mapped[int] = mapped_column(Integer, default=0)
    geometry = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
