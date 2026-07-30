from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import AgentReport, BusinessSession, Message, Prediction, Task, User

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

DONE = {"done", "complete", "completed"}


def _day_key(value: datetime) -> str:
    return value.strftime("%Y-%m-%d")


@router.get("/overview")
def overview(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    window = max(7, min(180, days))
    since = datetime.utcnow() - timedelta(days=window)

    sessions = db.query(BusinessSession).filter(BusinessSession.user_id == current_user.id).all()
    session_ids = [item.id for item in sessions]

    if not session_ids:
        return {
            "window_days": window,
            "has_data": False,
            "health_trend": [],
            "score_by_agent": [],
            "score_distribution": [],
            "task_flow": [],
            "task_priority": [],
            "task_status": [],
            "activity_heatmap": [],
            "agent_radar": [],
            "prediction_accuracy": [],
            "confidence_vs_outcome": [],
            "message_volume": [],
            "totals": {},
        }

    reports = (
        db.query(AgentReport)
        .filter(AgentReport.session_id.in_(session_ids), AgentReport.created_at >= since)
        .all()
    )
    tasks = db.query(Task).filter(Task.session_id.in_(session_ids)).all()
    messages = (
        db.query(Message)
        .filter(Message.session_id.in_(session_ids), Message.created_at >= since)
        .all()
    )
    predictions = db.query(Prediction).filter(Prediction.session_id.in_(session_ids)).all()

    by_day_scores: dict[str, list[int]] = defaultdict(list)
    for report in reports:
        by_day_scores[_day_key(report.created_at)].append(report.score)

    health_trend = [
        {"label": day[5:], "value": round(sum(scores) / len(scores))}
        for day, scores in sorted(by_day_scores.items())
    ][-14:]

    agent_scores: dict[str, list[int]] = defaultdict(list)
    for report in reports:
        if report.report_type == "agent":
            agent_scores[report.agent].append(report.score)

    score_by_agent = sorted(
        (
            {"label": agent, "value": round(sum(scores) / len(scores))}
            for agent, scores in agent_scores.items()
        ),
        key=lambda item: -item["value"],
    )

    completed_by_day: dict[str, int] = defaultdict(int)
    created_by_day: dict[str, int] = defaultdict(int)
    for task in tasks:
        if task.created_at and task.created_at >= since:
            created_by_day[_day_key(task.created_at)] += 1
        if task.completed_at and task.completed_at >= since:
            completed_by_day[_day_key(task.completed_at)] += 1

    all_days = sorted(set(created_by_day) | set(completed_by_day))[-14:]
    task_flow = [
        {"label": day[5:], "created": created_by_day.get(day, 0), "closed": completed_by_day.get(day, 0)}
        for day in all_days
    ]

    priority_counts: dict[str, int] = defaultdict(int)
    status_counts: dict[str, int] = defaultdict(int)
    for task in tasks:
        priority_counts[task.priority] += 1
        status_counts["Done" if task.status.lower() in DONE else "Open"] += 1

    heat: dict[str, int] = defaultdict(int)
    for message in messages:
        heat[_day_key(message.created_at)] += 1
    for report in reports:
        heat[_day_key(report.created_at)] += 1

    start = (datetime.utcnow() - timedelta(days=window)).date()
    activity_heatmap = [
        {"day": (start + timedelta(days=offset)).isoformat(), "value": heat.get((start + timedelta(days=offset)).isoformat(), 0)}
        for offset in range(window + 1)
    ]

    message_by_day: dict[str, int] = defaultdict(int)
    for message in messages:
        message_by_day[_day_key(message.created_at)] += 1
    message_volume = [
        {"label": day[5:], "value": count} for day, count in sorted(message_by_day.items())
    ][-14:]

    accuracy_buckets: dict[str, dict[str, int]] = defaultdict(lambda: {"hit": 0, "missed": 0})
    confidence_points = []
    for prediction in predictions:
        if prediction.status in {"hit", "missed"}:
            accuracy_buckets[prediction.agent][prediction.status] += 1
            confidence_points.append(
                {
                    "label": prediction.agent,
                    "x": prediction.confidence,
                    "y": 100 if prediction.status == "hit" else 0,
                }
            )

    prediction_accuracy = sorted(
        (
            {
                "label": agent,
                "value": round((counts["hit"] / max(1, counts["hit"] + counts["missed"])) * 100),
            }
            for agent, counts in accuracy_buckets.items()
        ),
        key=lambda item: -item["value"],
    )

    return {
        "window_days": window,
        "has_data": True,
        "health_trend": health_trend,
        "score_by_agent": score_by_agent,
        "score_distribution": [report.score for report in reports if report.report_type == "agent"],
        "task_flow": task_flow,
        "task_priority": [{"label": key, "value": value} for key, value in priority_counts.items()],
        "task_status": [{"label": key, "value": value} for key, value in status_counts.items()],
        "activity_heatmap": activity_heatmap,
        "agent_radar": score_by_agent[:8],
        "prediction_accuracy": prediction_accuracy,
        "confidence_vs_outcome": confidence_points,
        "message_volume": message_volume,
        "totals": {
            "sessions": len(sessions),
            "reports": len(reports),
            "tasks": len(tasks),
            "tasks_done": len([t for t in tasks if t.status.lower() in DONE]),
            "predictions": len(predictions),
            "predictions_resolved": len([p for p in predictions if p.status in {"hit", "missed"}]),
        },
    }
