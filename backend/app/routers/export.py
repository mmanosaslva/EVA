from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.core.security import get_current_user
from app.services import export_service

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/csv")
async def export_csv(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    csv_content = await export_service.export_csv(user_id, from_date, to_date)
    filename = f"eva_datos_{date.today().isoformat()}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pdf")
async def export_pdf(
    cycles_back: int = Query(6, ge=1, le=24),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    pdf_bytes = await export_service.export_pdf(user_id, cycles_back)
    filename = f"eva_informe_medico_{date.today().isoformat()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
