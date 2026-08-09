"""
Count It - backend API.

This is a thin proxy in front of Supabase Postgres. It does NOT re-implement
auth and it does NOT bypass Row Level Security: every request must carry the
same Supabase access token the frontend already gets from supabase-js auth,
and that token is forwarded to Postgres on every query. auth.uid() in your
existing RLS policies (supabase/schema.sql) is what actually enforces
"users only see their own data" - exactly like today, just via HTTP instead
of the JS client talking to Supabase directly.

Mirrors src/lib/db.js function-for-function so behavior doesn't change.
"""
import os
import secrets
import string
from datetime import datetime, timezone

import jwt
from fastapi import Body, Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from postgrest.exceptions import APIError
from supabase import Client, create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
# Optional. Only needed to resolve emails for Owner/Trainer dashboards
# (listing gym members/clients by email) - Supabase's admin user-lookup
# API requires the service role key, never the anon key. Get it from
# Supabase -> Project Settings -> API -> service_role (secret - never
# put this in frontend code). Everything else works fine without it,
# dashboards just show blank emails instead.
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# Optional now - only used as a fallback for projects still on the legacy
# shared-secret JWT signing method. Newer Supabase projects sign tokens
# with an asymmetric key (ES256/RS256) instead; those are verified via
# the public JWKS endpoint below, no secret needed.
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")
# Only this email can upload/delete learning videos. Same account already
# gated for the roadmap debug panel on the frontend - reusing it here.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "prakashkoulagi.official@gmail.com")
GRADUATION_REWARD_AMOUNT = 50

_jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")


def decode_supabase_token(token: str) -> dict:
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(token, signing_key.key, algorithms=["ES256", "RS256"], audience="authenticated")
    except (PyJWKClientError, jwt.InvalidTokenError):
        pass
    if SUPABASE_JWT_SECRET:
        return jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
    raise jwt.InvalidTokenError("Could not verify token via JWKS, and no legacy JWT secret is configured")

# Comma-separated list of allowed frontend origins, e.g.
# "https://count-it.vercel.app,https://count-it-git-test-branch-you.vercel.app"
# Falls back to "*" (open) if not set, so the app still works while you wire
# things up - tighten this once you know your real Vercel URL(s).
_origins_env = os.environ.get("FRONTEND_ORIGINS", "*")
ALLOWED_ORIGINS = ["*"] if _origins_env.strip() == "*" else [o.strip() for o in _origins_env.split(",") if o.strip()]

app = FastAPI(title="Count It API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


class AuthCtx:
    def __init__(self, user_id: str, email: str | None, client: Client):
        self.user_id = user_id
        self.email = email
        self.client = client


def get_auth(authorization: str = Header(default=None)) -> AuthCtx:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_supabase_token(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")

    # anon key + the user's own JWT -> Postgres sees the same auth.uid()
    # it always has, so every existing RLS policy applies unchanged.
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(token)
    return AuthCtx(user_id=user_id, email=payload.get("email"), client=client)


@app.exception_handler(APIError)
def handle_postgrest_error(request: Request, exc: APIError):
    # Surfaces real Postgres/RLS errors (e.g. "new row violates row-level
    # security") as a readable 400 instead of an opaque 500, same message
    # you'd have seen from supabase-js before.
    return JSONResponse(status_code=400, content={"detail": exc.message or str(exc)})


@app.get("/")
def health():
    return {"ok": True}


# ---------------------------------------------------------------- workouts

def _insert_children(client: Client, user_id: str, workout_id: str, exercises: list):
    if not exercises:
        return
    ex_payload = [
        {
            "workout_id": workout_id,
            "user_id": user_id,
            "name": ex.get("name"),
            "notes": ex.get("notes") or None,
            "superset_group": ex.get("superset") or None,
            "position": i,
        }
        for i, ex in enumerate(exercises)
    ]
    ex_res = client.table("exercises").insert(ex_payload).execute()
    id_by_pos = {row["position"]: row["id"] for row in (ex_res.data or [])}

    set_rows = []
    for i, ex in enumerate(exercises):
        for j, s in enumerate(ex.get("sets") or []):
            set_rows.append(
                {
                    "exercise_id": id_by_pos[i],
                    "user_id": user_id,
                    "weight": s.get("weight"),
                    "unit": s.get("unit") or "kg",
                    "reps": s.get("reps"),
                    "per_side": bool(s.get("perSide")),
                    "side": s.get("side") or None,
                    "feel": s.get("feel") or None,
                    "warmup": bool(s.get("warmup")),
                    "position": j,
                }
            )
    if set_rows:
        client.table("sets").insert(set_rows).execute()


@app.get("/api/workouts")
def fetch_workouts(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("workouts")
        .select(
            "id, date, split, notes, started_at, finished_at, "
            "exercises(id, name, notes, position, superset_group, "
            "sets(id, weight, unit, reps, per_side, side, feel, warmup, position))"
        )
        .order("date", desc=True)
        .order("created_at", desc=True)
        .execute()
    )
    workouts = res.data or []
    for w in workouts:
        w["exercises"] = sorted(w.get("exercises") or [], key=lambda e: e["position"])
        for ex in w["exercises"]:
            ex["sets"] = sorted(ex.get("sets") or [], key=lambda s: s["position"])
    return workouts


@app.post("/api/workouts")
def create_workout(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("workouts")
        .insert(
            {
                "user_id": ctx.user_id,
                "date": body.get("date"),
                "split": body.get("split") or None,
                "notes": body.get("notes") or None,
                "started_at": body.get("startedAt") or None,
                "finished_at": body.get("finishedAt") or None,
            }
        )
        .execute()
    )
    workout_id = res.data[0]["id"]
    _insert_children(ctx.client, ctx.user_id, workout_id, body.get("exercises") or [])
    return {"id": workout_id}


@app.put("/api/workouts/{workout_id}")
def update_workout(workout_id: str, body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("workouts").update(
        {
            "date": body.get("date"),
            "split": body.get("split") or None,
            "notes": body.get("notes") or None,
            "started_at": body.get("startedAt") or None,
            "finished_at": body.get("finishedAt") or None,
        }
    ).eq("id", workout_id).execute()
    # Replace children wholesale (sets cascade-delete with their exercises).
    ctx.client.table("exercises").delete().eq("workout_id", workout_id).execute()
    _insert_children(ctx.client, ctx.user_id, workout_id, body.get("exercises") or [])
    return {"ok": True}


@app.delete("/api/workouts/{workout_id}")
def delete_workout(workout_id: str, ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("workouts").delete().eq("id", workout_id).execute()
    return {"ok": True}


# ----------------------------------------------------------------- profile

_PROFILE_COLUMNS = (
    "goals, goal_note, height_cm, date_of_birth, sex, goal_priority, target_weight, "
    "target_weight_unit, activity_level, experience_level, train_locations, has_trainer, "
    "injury_notes, workout_days_per_week, reminders_enabled, rest_day_nudges_enabled, "
    "dietary_prefs, onboarding_completed_at, "
    "role, owner_name, gym_name, contact, owner_gym_code, linked_gym_code, assigned_trainer_id"
)


@app.get("/api/profile")
def fetch_profile(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("profiles")
        .select(_PROFILE_COLUMNS)
        .eq("user_id", ctx.user_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


@app.put("/api/profile/goals")
def save_profile_goals(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("profiles").upsert(
        {
            "user_id": ctx.user_id,
            "goals": body.get("goals"),
            "goal_note": body.get("goalNote") or None,
            "updated_at": now_iso(),
        }
    ).execute()
    return {"ok": True}


@app.put("/api/profile/height")
def save_height(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("profiles").upsert(
        {"user_id": ctx.user_id, "height_cm": body.get("heightCm"), "updated_at": now_iso()}
    ).execute()
    return {"ok": True}


# --------------------------------------------------------------- onboarding

@app.post("/api/onboarding")
def save_onboarding(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("profiles").upsert(
        {
            "user_id": ctx.user_id,
            "date_of_birth": body.get("dateOfBirth") or None,
            "sex": body.get("sex") or None,
            "height_cm": body.get("heightCm"),
            "goals": body.get("goals") or [],
            "goal_note": body.get("goalNote") or None,
            "goal_priority": body.get("goalPriority") or [],
            "target_weight": body.get("targetWeight"),
            "target_weight_unit": body.get("targetWeightUnit") or None,
            "activity_level": body.get("activityLevel") or None,
            "experience_level": body.get("experienceLevel") or None,
            "train_locations": body.get("trainLocations") or [],
            "has_trainer": body.get("hasTrainer"),
            "injury_notes": body.get("injuryNotes") or None,
            "workout_days_per_week": body.get("workoutDaysPerWeek"),
            "reminders_enabled": body.get("remindersEnabled", True),
            "rest_day_nudges_enabled": body.get("restDayNudgesEnabled", False),
            "dietary_prefs": body.get("dietaryPrefs") or [],
            "onboarding_completed_at": now_iso(),
            "updated_at": now_iso(),
        }
    ).execute()

    weight = body.get("weight")
    if weight:
        ctx.client.table("body_metrics").insert(
            {
                "user_id": ctx.user_id,
                "date": today_iso(),
                "weight": weight,
                "weight_unit": body.get("weightUnit") or "kg",
            }
        ).execute()

    if body.get("experienceLevel") == "beginner":
        ctx.client.table("roadmap_progress").upsert(
            {"user_id": ctx.user_id}, on_conflict="user_id", ignore_duplicates=True
        ).execute()

    return {"ok": True}


# ------------------------------------------------------------------ roadmap

@app.post("/api/roadmap/init")
def init_roadmap(ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("roadmap_progress").upsert(
        {"user_id": ctx.user_id}, on_conflict="user_id", ignore_duplicates=True
    ).execute()
    return {"ok": True}


@app.get("/api/roadmap")
def fetch_roadmap(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("roadmap_progress")
        .select("stage, started_at, graduated_at, reward_amount, reward_status, stage2_milestones_seen")
        .eq("user_id", ctx.user_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


@app.put("/api/roadmap/stage")
def advance_roadmap_stage(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("roadmap_progress").update(
        {"stage": body.get("stage"), "updated_at": now_iso()}
    ).eq("user_id", ctx.user_id).execute()
    return {"ok": True}


@app.put("/api/roadmap/milestone")
def mark_stage2_milestone_seen(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    day = body.get("day")
    res = (
        ctx.client.table("roadmap_progress")
        .select("stage2_milestones_seen")
        .eq("user_id", ctx.user_id)
        .maybe_single()
        .execute()
    )
    current = (res.data or {}).get("stage2_milestones_seen") or []
    if day not in current:
        current = sorted(set(current) | {day})
        ctx.client.table("roadmap_progress").update(
            {"stage2_milestones_seen": current, "updated_at": now_iso()}
        ).eq("user_id", ctx.user_id).execute()
    return {"stage2_milestones_seen": current}


@app.post("/api/roadmap/graduate")
def mark_roadmap_graduated(ctx: AuthCtx = Depends(get_auth)):
    # Reward is a status flag only - "earned" here means the milestone is
    # met, not that money has moved. Actual payout is a separate feature
    # (needs a payment gateway) not built yet.
    ctx.client.table("roadmap_progress").update(
        {
            "graduated_at": now_iso(),
            "reward_amount": GRADUATION_REWARD_AMOUNT,
            "reward_status": "earned",
            "updated_at": now_iso(),
        }
    ).eq("user_id", ctx.user_id).execute()
    return {"ok": True}


@app.put("/api/roadmap/debug")
def debug_set_roadmap_progress(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    # Test-only, mirrors debugSetRoadmapProgress in db.js. Kept unrestricted
    # here exactly as before - Roadmap.jsx already gates the UI entry point
    # to one specific account email.
    payload = {"updated_at": now_iso()}
    if "stage" in body:
        payload["stage"] = body["stage"]
        # Debug jumping to stage 1 should also clear seen milestones -
        # otherwise re-testing the stage 2 celebrations shows nothing
        # because they're already marked seen from a previous test pass.
        if body["stage"] == 1:
            payload["stage2_milestones_seen"] = []
    if "startedAt" in body:
        payload["started_at"] = body["startedAt"]
    if "graduatedAt" in body:
        payload["graduated_at"] = body["graduatedAt"]
        # Debug-resetting graduation should also clear the reward flag,
        # so repeated test runs of the full journey don't leave a stale
        # "earned" status lying around from a previous test pass.
        if body["graduatedAt"] is None:
            payload["reward_amount"] = None
            payload["reward_status"] = None
        else:
            payload["reward_amount"] = GRADUATION_REWARD_AMOUNT
            payload["reward_status"] = "earned"
    res = (
        ctx.client.table("roadmap_progress")
        .update(payload)
        .eq("user_id", ctx.user_id)
        .execute()
    )
    return res.data[0] if res.data else None


# -------------------------------------------------------------- body weight

@app.get("/api/body-metrics")
def fetch_body_metrics(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("body_metrics")
        .select("id, date, weight, weight_unit")
        .order("date", desc=True)
        .execute()
    )
    return res.data or []


@app.post("/api/body-metrics")
def insert_body_metric(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("body_metrics").insert(
        {
            "user_id": ctx.user_id,
            "date": body.get("date"),
            "weight": body.get("weight"),
            "weight_unit": body.get("weightUnit"),
        }
    ).execute()
    return {"ok": True}


@app.delete("/api/body-metrics/{metric_id}")
def delete_body_metric(metric_id: str, ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("body_metrics").delete().eq("id", metric_id).execute()
    return {"ok": True}


# ---------------------------------------------------------- exercise targets

@app.get("/api/exercise-targets")
def fetch_exercise_targets(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("exercise_targets")
        .select("exercise_name, target_reps, seed_weight, seed_weight_unit, track_sides, per_side")
        .execute()
    )
    out = {}
    for row in res.data or []:
        out[row["exercise_name"].lower()] = {
            "reps": row["target_reps"],
            "seedWeight": row["seed_weight"],
            "seedWeightUnit": row["seed_weight_unit"],
            "trackSides": bool(row["track_sides"]),
            "perSide": bool(row["per_side"]),
        }
    return out


@app.put("/api/exercise-targets")
def save_exercise_target(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("exercise_targets").upsert(
        {
            "user_id": ctx.user_id,
            "exercise_name": body.get("exerciseName"),
            "target_reps": body.get("targetReps"),
            "seed_weight": body.get("seedWeight"),
            "seed_weight_unit": body.get("seedWeightUnit"),
            "updated_at": now_iso(),
        }
    ).execute()
    return {"ok": True}


@app.put("/api/exercise-targets/track-sides")
def set_track_sides(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("exercise_targets").upsert(
        {
            "user_id": ctx.user_id,
            "exercise_name": body.get("exerciseName"),
            "track_sides": body.get("trackSides"),
            "updated_at": now_iso(),
        }
    ).execute()
    return {"ok": True}


@app.put("/api/exercise-targets/per-side")
def set_per_side(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("exercise_targets").upsert(
        {
            "user_id": ctx.user_id,
            "exercise_name": body.get("exerciseName"),
            "per_side": body.get("perSide"),
            "updated_at": now_iso(),
        }
    ).execute()
    return {"ok": True}


# -------------------------------------------------------------------- templates

@app.get("/api/templates")
def fetch_templates(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("templates")
        .select("id, name, exercise_names, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return [
        {"id": t["id"], "name": t["name"], "exerciseNames": t["exercise_names"]}
        for t in (res.data or [])
    ]


@app.post("/api/templates")
def save_template(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("templates").insert(
        {
            "user_id": ctx.user_id,
            "name": body.get("name"),
            "exercise_names": body.get("exerciseNames"),
        }
    ).execute()
    return {"ok": True}


@app.delete("/api/templates/{template_id}")
def delete_template(template_id: str, ctx: AuthCtx = Depends(get_auth)):
    ctx.client.table("templates").delete().eq("id", template_id).execute()
    return {"ok": True}


# --------------------------------------------------------- learning videos

def video_public_url(storage_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/learning-videos/{storage_path}"


@app.get("/api/videos")
def fetch_videos(ctx: AuthCtx = Depends(get_auth)):
    res = (
        ctx.client.table("learning_videos")
        .select("id, title, description, storage_path, stage, exercise_name, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return [
        {
            "id": v["id"],
            "title": v["title"],
            "description": v["description"],
            "stage": v["stage"],
            "exerciseName": v["exercise_name"],
            "url": video_public_url(v["storage_path"]),
        }
        for v in (res.data or [])
    ]


@app.post("/api/videos")
def create_video(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    # File bytes are uploaded straight from the browser to Supabase
    # Storage (protected by the storage RLS policy for this bucket) -
    # this endpoint only records the metadata row once that succeeds.
    if ctx.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only the app owner can upload videos.")
    res = (
        ctx.client.table("learning_videos")
        .insert(
            {
                "title": body.get("title"),
                "description": body.get("description") or None,
                "storage_path": body.get("storagePath"),
                "stage": body.get("stage"),
                "exercise_name": body.get("exerciseName") or None,
            }
        )
        .execute()
    )
    return {"id": res.data[0]["id"]}


@app.delete("/api/videos/{video_id}")
def delete_video(video_id: str, ctx: AuthCtx = Depends(get_auth)):
    if ctx.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only the app owner can delete videos.")
    ctx.client.table("learning_videos").delete().eq("id", video_id).execute()
    return {"ok": True}


# --------------------------------------------------------- roles & gyms

GYM_CODE_ALPHABET = string.ascii_uppercase + string.digits
GYM_CODE_AMBIGUOUS = "0O1IL"  # excluded - easy to misread when someone reads it aloud
GYM_CODE_CHARS = "".join(c for c in GYM_CODE_ALPHABET if c not in GYM_CODE_AMBIGUOUS)


def generate_gym_code(client: Client) -> str:
    # Collision odds are astronomically low at 6 chars from a 31-symbol
    # alphabet (~887M combinations), but check anyway and retry - a
    # silent duplicate would be a real bug, not a hypothetical one.
    for _ in range(10):
        code = "".join(secrets.choice(GYM_CODE_CHARS) for _ in range(6))
        existing = (
            client.table("profiles").select("user_id").eq("owner_gym_code", code).maybe_single().execute()
        )
        if not existing or not existing.data:
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique gym code, try again.")


@app.post("/api/profile/role")
def save_role(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    role = body.get("role")
    if role not in ("individual", "owner", "trainer"):
        raise HTTPException(status_code=400, detail="Invalid role.")

    payload = {"user_id": ctx.user_id, "role": role, "updated_at": now_iso()}

    if role == "owner":
        payload["owner_name"] = body.get("ownerName")
        payload["gym_name"] = body.get("gymName")
        payload["contact"] = body.get("contact")
        payload["owner_gym_code"] = generate_gym_code(ctx.client)
    else:
        payload["contact"] = body.get("contact")
        gym_code = (body.get("gymCode") or "").strip().upper() or None
        if gym_code:
            owner_row = (
                ctx.client.table("profiles")
                .select("user_id")
                .eq("owner_gym_code", gym_code)
                .eq("role", "owner")
                .maybe_single()
                .execute()
            )
            if not owner_row or not owner_row.data:
                raise HTTPException(status_code=400, detail="That gym code doesn't match any gym.")
            payload["linked_gym_code"] = gym_code

    res = ctx.client.table("profiles").upsert(payload).execute()
    return res.data[0] if res.data else payload


@app.get("/api/gym/members")
def fetch_gym_members(ctx: AuthCtx = Depends(get_auth)):
    me = (
        ctx.client.table("profiles")
        .select("role, owner_gym_code, gym_name")
        .eq("user_id", ctx.user_id)
        .maybe_single()
        .execute()
    )
    if not me or not me.data or me.data.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only a gym owner can view this.")
    gym_code = me.data.get("owner_gym_code")

    linked = (
        ctx.client.table("profiles")
        .select("user_id, role, contact, assigned_trainer_id")
        .eq("linked_gym_code", gym_code)
        .execute()
    )
    rows = linked.data or []
    user_ids = [r["user_id"] for r in rows]
    emails_by_id = fetch_emails_for_users(ctx.client, user_ids)

    trainers = [
        {"userId": r["user_id"], "email": emails_by_id.get(r["user_id"]), "contact": r["contact"]}
        for r in rows
        if r["role"] == "trainer"
    ]
    members = [
        {
            "userId": r["user_id"],
            "email": emails_by_id.get(r["user_id"]),
            "assignedTrainerId": r["assigned_trainer_id"],
        }
        for r in rows
        if r["role"] == "individual"
    ]
    return {"gymCode": gym_code, "gymName": me.data.get("gym_name"), "trainers": trainers, "members": members}


@app.put("/api/gym/assign-trainer")
def assign_trainer(body: dict = Body(...), ctx: AuthCtx = Depends(get_auth)):
    me = (
        ctx.client.table("profiles")
        .select("role, owner_gym_code")
        .eq("user_id", ctx.user_id)
        .maybe_single()
        .execute()
    )
    if not me or not me.data or me.data.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Only a gym owner can do this.")
    gym_code = me.data.get("owner_gym_code")

    member_user_id = body.get("memberUserId")
    trainer_user_id = body.get("trainerUserId")  # None/null clears the assignment

    # Confirm the member actually belongs to this owner's gym before
    # touching their row - RLS also allows the write itself only via the
    # member's own policy, so this call updates through a targeted
    # eq() filter rather than assuming any row id is fair game.
    member_row = (
        ctx.client.table("profiles")
        .select("user_id")
        .eq("user_id", member_user_id)
        .eq("linked_gym_code", gym_code)
        .eq("role", "individual")
        .maybe_single()
        .execute()
    )
    if not member_row or not member_row.data:
        raise HTTPException(status_code=404, detail="That member isn't part of your gym.")

    if trainer_user_id:
        trainer_row = (
            ctx.client.table("profiles")
            .select("user_id")
            .eq("user_id", trainer_user_id)
            .eq("linked_gym_code", gym_code)
            .eq("role", "trainer")
            .maybe_single()
            .execute()
        )
        if not trainer_row or not trainer_row.data:
            raise HTTPException(status_code=404, detail="That trainer isn't part of your gym.")

    ctx.client.table("profiles").update(
        {"assigned_trainer_id": trainer_user_id, "updated_at": now_iso()}
    ).eq("user_id", member_user_id).execute()
    return {"ok": True}


@app.get("/api/trainer/clients")
def fetch_trainer_clients(ctx: AuthCtx = Depends(get_auth)):
    me = (
        ctx.client.table("profiles")
        .select("role")
        .eq("user_id", ctx.user_id)
        .maybe_single()
        .execute()
    )
    if not me or not me.data or me.data.get("role") != "trainer":
        raise HTTPException(status_code=403, detail="Only a trainer can view this.")

    clients = (
        ctx.client.table("profiles")
        .select("user_id")
        .eq("assigned_trainer_id", ctx.user_id)
        .execute()
    )
    client_ids = [c["user_id"] for c in (clients.data or [])]
    if not client_ids:
        return []

    emails_by_id = fetch_emails_for_users(ctx.client, client_ids)

    workouts = (
        ctx.client.table("workouts")
        .select("user_id, date")
        .in_("user_id", client_ids)
        .execute()
    )
    by_client = {}
    for w in workouts.data or []:
        uid = w["user_id"]
        by_client.setdefault(uid, []).append(w["date"])

    out = []
    for uid in client_ids:
        dates = sorted(by_client.get(uid, []), reverse=True)
        out.append(
            {
                "userId": uid,
                "email": emails_by_id.get(uid),
                "totalSessions": len(dates),
                "lastWorkoutDate": dates[0] if dates else None,
            }
        )
    return out


def fetch_emails_for_users(client: Client, user_ids: list) -> dict:
    # profiles doesn't store email (it lives on auth.users) - the admin
    # auth API is the only way to resolve it, and only the service role
    # can call it. Falls back to blank emails rather than failing the
    # whole request if that's not configured, since the dashboards are
    # still useful without it (just shown as "member" instead of an
    # address).
    if not user_ids or not SUPABASE_SERVICE_ROLE_KEY:
        return {}
    admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    out = {}
    for uid in user_ids:
        try:
            res = admin_client.auth.admin.get_user_by_id(uid)
            out[uid] = res.user.email if res and res.user else None
        except Exception:
            out[uid] = None
    return out