from fastapi.testclient import TestClient

import db
from models import Customer, Farm, ManagerFarmAssignment, Shed, User


def _login_as_demo_owner(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "owner@demo.local", "password": "owner-pass"},
    )
    assert response.status_code == 200


def test_owner_cannot_access_another_customers_farm(
    client: TestClient,
) -> None:
    customer_id = "test-other-customer"
    farm_id = "test-other-farm"
    shed_id = "test-other-shed"
    with db.SessionLocal() as session:
        session.add(Customer(id=customer_id, name="Other Customer"))
        session.add(
            Farm(
                id=farm_id,
                customer_id=customer_id,
                name="Other Farm",
                location=None,
            )
        )
        session.add(
            Shed(
                id=shed_id,
                farm_id=farm_id,
                name="Other Shed",
                number=1,
            )
        )
        session.commit()

    _login_as_demo_owner(client)
    assert client.get(f"/api/farms/{farm_id}/sheds").status_code == 404
    assert (
        client.post(
            f"/api/farms/{farm_id}/sheds",
            json={"name": "Unauthorized Shed"},
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/farms/{farm_id}",
            json={"name": "Unauthorized Farm"},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/farms/{farm_id}").status_code == 404
    assert (
        client.patch(
            f"/api/sheds/{shed_id}",
            json={"name": "Unauthorized Shed"},
        ).status_code
        == 404
    )
    assert client.delete(f"/api/sheds/{shed_id}").status_code == 404
    assert (
        client.post(
            "/api/managers",
            json={
                "email": "cross-tenant@demo.local",
                "password": "temp-pass",
                "farm_ids": [farm_id],
            },
        ).status_code
        == 404
    )
    assert (
        client.get(
            "/api/dashboard",
            params={"farm_id": farm_id},
        ).status_code
        == 404
    )

    with db.SessionLocal() as session:
        session.delete(session.get(Farm, farm_id))
        session.flush()
        session.delete(session.get(Customer, customer_id))
        session.commit()


def test_delete_farm_cascades_sheds_and_manager_assignments(
    client: TestClient,
) -> None:
    farm_id = "test-cascade-farm"
    shed_id = "test-cascade-shed"
    with db.SessionLocal() as session:
        owner = session.query(User).filter_by(email="owner@demo.local").one()
        manager = session.query(User).filter_by(email="manager@demo.local").one()
        session.add(
            Farm(
                id=farm_id,
                customer_id=owner.customer_id,
                name="Cascade Farm",
                location=None,
            )
        )
        session.add(
            Shed(
                id=shed_id,
                farm_id=farm_id,
                name="Cascade Shed",
                number=1,
            )
        )
        session.add(
            ManagerFarmAssignment(user_id=manager.id, farm_id=farm_id)
        )
        session.commit()

    _login_as_demo_owner(client)
    assert client.delete(f"/api/farms/{farm_id}").status_code == 200

    with db.SessionLocal() as session:
        assert session.get(Farm, farm_id) is None
        assert session.get(Shed, shed_id) is None
        assert (
            session.query(ManagerFarmAssignment)
            .filter_by(farm_id=farm_id)
            .one_or_none()
            is None
        )
