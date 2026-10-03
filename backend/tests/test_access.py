import db
from access import get_farm_for_user, list_farms_for_user
from models import Farm, ManagerFarmAssignment, User


def test_owner_sees_all_tenant_farms_manager_sees_assigned_only():
    with db.SessionLocal() as session:
        owner = session.query(User).filter(User.email == "owner@demo.local").one()
        manager = session.query(User).filter(User.email == "manager@demo.local").one()

        farm_a = Farm(
            id="test-farm-a",
            customer_id=owner.customer_id,
            name="A",
            location=None,
        )
        farm_b = Farm(
            id="test-farm-b",
            customer_id=owner.customer_id,
            name="B",
            location=None,
        )
        session.add_all([farm_a, farm_b])
        session.add(
            ManagerFarmAssignment(user_id=manager.id, farm_id="test-farm-a")
        )
        session.commit()

        owner_ids = {f.id for f in list_farms_for_user(session, owner)}
        manager_ids = {f.id for f in list_farms_for_user(session, manager)}
        assert "test-farm-a" in owner_ids and "test-farm-b" in owner_ids
        assert "test-farm-a" in manager_ids
        assert "test-farm-b" not in manager_ids
        assert get_farm_for_user(session, manager, "test-farm-b") is None
        assert get_farm_for_user(session, manager, "test-farm-a") is not None

        session.query(ManagerFarmAssignment).filter(
            ManagerFarmAssignment.farm_id.in_(["test-farm-a", "test-farm-b"])
        ).delete(synchronize_session=False)
        session.query(Farm).filter(
            Farm.id.in_(["test-farm-a", "test-farm-b"])
        ).delete(synchronize_session=False)
        session.commit()
