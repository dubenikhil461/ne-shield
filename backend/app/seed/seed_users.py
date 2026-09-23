"""Seed default users."""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole


def seed():
    db = SessionLocal()
    users = [
        ("Admin User", "admin@example.com", "admin123", UserRole.ADMIN.value),
        ("Operator User", "operator@example.com", "operator123", UserRole.OPERATOR.value),
        ("Field Officer", "field@example.com", "field123", UserRole.FIELD_OFFICER.value),
    ]
    for name, email, password, role in users:
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            user = User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                role=role,
                is_active=True,
            )
            db.add(user)
            print(f"  Created user: {email} [{role}]")
    db.commit()
    db.close()
    print("Users seeded.")


if __name__ == "__main__":
    seed()
