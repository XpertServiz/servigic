from fastapi import Header, HTTPException, status

from app.config import settings


async def require_internal_key(x_internal_key: str = Header(default="")) -> None:
    """Every route here is called server-to-server from the Next.js app only —
    never directly from a browser. This shared-secret header is the gate."""
    if not x_internal_key or x_internal_key != settings.internal_service_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing internal key")
