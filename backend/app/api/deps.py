"""Shared API dependencies.

NOTE: Developer 1 should enhance get_current_user to return
a full User ORM object from the database.
"""
from fastapi import Depends
from app.core.database import get_db
from app.core.security import get_current_user
from sqlalchemy.orm import Session


def get_database(db: Session = Depends(get_db)):
    return db
