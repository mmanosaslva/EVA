from fastapi import HTTPException, status

from app.repositories import account_repo


async def delete_account(user_id: str) -> None:
    """Borrado total e irreversible de la cuenta (Docs/s10/restricciones.md RX-08)."""
    deleted = await account_repo.delete_all_user_data(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
