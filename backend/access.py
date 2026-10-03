from sqlalchemy.orm import Session

from models import Farm, ManagerFarmAssignment, User


def user_assigned_to_farm(db: Session, user_id: str, farm_id: str) -> bool:
    row = (
        db.query(ManagerFarmAssignment)
        .filter_by(user_id=user_id, farm_id=farm_id)
        .one_or_none()
    )
    return row is not None


def list_farms_for_user(db: Session, user: User) -> list[Farm]:
    q = db.query(Farm).filter(Farm.customer_id == user.customer_id)
    if user.role == "owner":
        return q.order_by(Farm.name).all()
    if user.role == "farm_manager":
        return (
            q.join(
                ManagerFarmAssignment,
                ManagerFarmAssignment.farm_id == Farm.id,
            )
            .filter(ManagerFarmAssignment.user_id == user.id)
            .order_by(Farm.name)
            .all()
        )
    return []


def get_farm_for_user(db: Session, user: User, farm_id: str) -> Farm | None:
    farm = db.get(Farm, farm_id)
    if farm is None or farm.customer_id != user.customer_id:
        return None
    if user.role == "owner":
        return farm
    if user.role == "farm_manager" and user_assigned_to_farm(
        db, user.id, farm_id
    ):
        return farm
    return None
