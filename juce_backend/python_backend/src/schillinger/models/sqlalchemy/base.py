"""
Base SQLAlchemy model with common fields.

Provides timestamp tracking and UUID generation for all models.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.

    Provides:
    - Automatic table name generation from class name
    - Repr generation for debugging
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate table name from class name (camel_case to snake_case)."""
        name = cls.__name__
        # Convert CamelCase to snake_case
        result = [name[0].lower()]
        for char in name[1:]:
            if char.isupper():
                result.extend(["_", char.lower()])
            else:
                result.append(char)
        return "".join(result) + "s"

    def __repr__(self) -> str:
        """Generate string representation for debugging."""
        class_name = self.__class__.__name__
        attrs = []
        for key in self.__mapper__.columns.keys():
            value = getattr(self, key, None)
            if value is not None:
                attrs.append(f"{key}={value!r}")
        return f"{class_name}({', '.join(attrs)})"


class BaseModel(Base):
    """
    Base model with common fields for all telemetry models.

    Provides:
    - id: UUID primary key
    - created_at: Auto-generated timestamp on creation
    - updated_at: Auto-updated timestamp on modification

    Note:
        This is an abstract base class - it does not create its own table.
        Child models inherit these fields directly.
    """

    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
