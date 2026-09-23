"""Application logging configuration."""
import logging
import sys
from logging.handlers import RotatingFileHandler


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger with console + rotating file handler."""
    root = logging.getLogger()
    if root.handlers:
        return  # already configured

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    root.addHandler(console)

    try:
        file_handler = RotatingFileHandler(
            "app.log", maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        root.addHandler(file_handler)
    except OSError:
        pass

    root.setLevel(level)
