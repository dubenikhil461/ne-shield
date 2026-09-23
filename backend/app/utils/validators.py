"""Data validation helpers."""
from fastapi import HTTPException, status


def validate_moisture(value: float) -> float:
    """Validate moisture percentage is within valid range."""
    if not 0 <= value <= 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Moisture value {value} out of range. Must be 0-100.",
        )
    return value


def validate_coordinates(lat: float, lon: float) -> tuple[float, float]:
    """Validate geographic coordinates."""
    if not -90 <= lat <= 90:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Latitude {lat} out of range. Must be -90 to 90.",
        )
    if not -180 <= lon <= 180:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Longitude {lon} out of range. Must be -180 to 180.",
        )
    return lat, lon
