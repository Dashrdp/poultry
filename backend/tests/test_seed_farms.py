import db
from flocks import LAYING_FROM_WEEK, active_flock, age_week
from models import DailyShedLog, Farm, FarmRates, FeedMovement, ManagerFarmAssignment, Shed, User
from seed import DEMO_SHED_IDS, OPS_DAYS, seed_demo, seed_ops_history


def test_seed_creates_farms_and_assigns_manager_to_farm_one_only():
    with db.SessionLocal() as session:
        seed_demo(session, with_ops=False)
        farms = session.query(Farm).filter(Farm.customer_id.isnot(None)).all()
        ids = {f.id for f in farms}
        assert {"farm-1", "farm-2", "farm-3"}.issubset(ids)
        sheds = session.query(Shed).filter(Shed.farm_id == "farm-1").all()
        assert len(sheds) >= 2
        manager = session.query(User).filter(User.email == "manager@demo.local").one()
        assigned = {
            a.farm_id
            for a in session.query(ManagerFarmAssignment).filter_by(
                user_id=manager.id
            )
        }
        assert assigned == {"farm-1"}


def test_seed_ops_history_fills_year_for_all_farms():
    with db.SessionLocal() as session:
        seed_demo(session, with_ops=False)
        seed_ops_history(session, force=True)

        rates = {
            r.farm_id: r for r in session.query(FarmRates).filter(
                FarmRates.farm_id.in_(("farm-1", "farm-2", "farm-3"))
            )
        }
        assert set(rates) == {"farm-1", "farm-2", "farm-3"}
        assert rates["farm-1"].egg_price > 0
        assert rates["farm-1"].feed_cost_per_kg > 0

        for shed_id in DEMO_SHED_IDS:
            flock = active_flock(session, shed_id)
            assert flock is not None
            assert 0 < flock.live_birds <= flock.birds_placed
            logs = session.query(DailyShedLog).filter_by(shed_id=shed_id).all()
            assert logs
            assert len(logs) <= OPS_DAYS
            assert all(log.flock_id == flock.id for log in logs)
            assert all(
                age_week(flock.hatch_date, log.date) >= LAYING_FROM_WEEK for log in logs
            )

        for farm_id in ("farm-1", "farm-2", "farm-3"):
            movements = (
                session.query(FeedMovement).filter(FeedMovement.farm_id == farm_id).all()
            )
            assert len(movements) > 0
            stock = sum(
                m.qty_kg if m.direction == "in" else -m.qty_kg for m in movements
            )
            assert stock > 100.0  # > 1 quintal
