#!/usr/bin/env python3
"""
WBS → Supabase Sync Script
Parses all WBS.md files in the repo and upserts to tasks_sync + milestones tables.
Triggered by GitHub Actions on push when WBS.md files change.

Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/sync_wbs_to_supabase.py
"""

import os
import re
import sys
from pathlib import Path

import yaml


def get_supabase_client():
    from supabase import create_client  # lazy import — not needed by parser unit tests
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)
    return create_client(url, key)


# ──────────────────────────────────────────
# Parsers
# ──────────────────────────────────────────

def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Extract YAML frontmatter and return (frontmatter_dict, body)."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return {}, content
    try:
        fm = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as e:
        print(f"YAML parse error: {e}", file=sys.stderr)
        return {}, content
    return fm, content[match.end():]


def parse_task_line(line: str) -> dict | None:
    """Parse a single WBS task line. Returns None if not a task line."""
    checkbox_match = re.match(r"^- \[([ xX])\] ", line, re.IGNORECASE)
    if not checkbox_match:
        return None

    checked = checkbox_match.group(1).strip().lower() == "x"
    rest = line[checkbox_match.end():]

    # Task ID: M1, M1.1, M1.1.1, etc.
    id_match = re.match(r"^(M\d+(?:\.\d+)*)\s+", rest)
    if not id_match:
        return None

    external_id = id_match.group(1)
    rest = rest[id_match.end():]

    # Owner: [owner:: Role:Name]
    owner_match = re.search(r"\[owner::\s*([^\]]+)\]", rest)
    owner_str = owner_match.group(1).strip() if owner_match else None

    # Deadline: #YYYY-MM-DD
    deadline_match = re.search(r"#(\d{4}-\d{2}-\d{2})", rest)
    deadline = deadline_match.group(1) if deadline_match else None

    # Blocked tag
    is_blocked = bool(re.search(r"#blocked", rest, re.IGNORECASE))

    # Title: everything before [owner:: or first # tag, trimmed
    title = rest
    if owner_match:
        title = title[: owner_match.start()]
    title = re.sub(r"\s+#\S+", "", title).strip()

    # Parse owner
    assignee_role = assignee_name = None
    if owner_str:
        parts = owner_str.split(":", 1)
        if len(parts) == 2:
            assignee_role = parts[0].strip()
            assignee_name = parts[1].strip()

    yaml_data = {"blocked": True} if is_blocked else None

    return {
        "external_id": external_id,
        "title": title,
        "status": "Done" if checked else "Todo",
        "assignee_role": assignee_role,
        "assignee_name": assignee_name,
        "deadline": deadline,
        "yaml_data": yaml_data,
    }


def parse_tasks(body: str, team_config: dict) -> list[dict]:
    """Parse all task lines from WBS body, resolving emails from team config."""
    tasks = []
    section_stack: list[str] = []

    for line in body.splitlines():
        h2 = re.match(r"^## (.+)$", line)
        h3 = re.match(r"^### (.+)$", line)

        if h2:
            section_stack = [h2.group(1).strip()]
        elif h3:
            if section_stack:
                section_stack = [section_stack[0], h3.group(1).strip()]
            else:
                section_stack = [h3.group(1).strip()]

        task = parse_task_line(line)
        if task:
            # wbs_path for traceability
            task["wbs_path"] = " > ".join(section_stack + [task["external_id"]])

            # Resolve email from team config
            role = task.get("assignee_role")
            if role and isinstance(team_config.get(role), dict):
                task["assignee_email"] = team_config[role].get("email")
            else:
                task["assignee_email"] = None

            tasks.append(task)

    return tasks


def parse_milestones(body: str) -> list[dict]:
    """Parse milestone table from the 里程碑 section."""
    milestones = []
    in_section = False

    for line in body.splitlines():
        if re.match(r"^## 里程碑", line):
            in_section = True
            continue
        if in_section and re.match(r"^## ", line):
            in_section = False
            continue
        if not in_section:
            continue

        # Table data row (skip header / separator rows)
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5:
            continue
        mid, name, planned, actual, status = cells[:5]

        if not re.match(r"^M\d+$", mid):
            continue  # header or separator row

        def clean_date(d: str) -> str | None:
            d = d.strip()
            return d if re.match(r"^\d{4}-\d{2}-\d{2}$", d) else None

        milestones.append({
            "milestone_id": mid,
            "milestone_name": name,
            "planned_date": clean_date(planned),
            "actual_date": clean_date(actual),
            "is_completed": status.strip() == "完成",
        })

    return milestones


# ──────────────────────────────────────────
# Supabase operations
# ──────────────────────────────────────────

def get_or_create_project(supabase, name: str, repo_full_name: str) -> tuple[str, bool]:
    """Return (project_uuid, is_new). Creates the project if it doesn't exist."""
    result = supabase.table("projects").select("id").eq("name", name).execute()
    if result.data:
        return result.data[0]["id"], False

    insert = supabase.table("projects").insert({
        "name": name,
        "repo_full_name": repo_full_name,
        "status": "active",
    }).execute()
    return insert.data[0]["id"], True


def bootstrap_admin(supabase, project_id: str, admin_email: str) -> None:
    """Add admin_email as admin of project_id if their profile exists.
    Safe to call on every sync — ON CONFLICT DO NOTHING prevents duplicates.
    """
    result = supabase.table("profiles").select("id").eq("email", admin_email).execute()
    if not result.data:
        print(f"  ⚠ admin_email {admin_email!r} not yet registered — "
              f"run sync again after first login to bootstrap access", file=sys.stderr)
        return
    user_id = result.data[0]["id"]
    supabase.table("project_access").upsert(
        {"user_id": user_id, "project_id": project_id, "role": "admin"},
        on_conflict="user_id,project_id",
    ).execute()
    print(f"  👤 admin bootstrapped: {admin_email}")


def sync_wbs_file(supabase, wbs_path: Path, repo_full_name: str) -> None:
    content = wbs_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(content)

    if fm.get("doc_type") != "WBS":
        print(f"  skip {wbs_path} (doc_type != WBS)")
        return

    project_name = fm.get("project")
    if not project_name:
        print(f"  skip {wbs_path} (no project field)")
        return

    print(f"\n📁 {wbs_path}  →  project: {project_name}")

    team_config = fm.get("team") or {}
    project_id, is_new = get_or_create_project(supabase, project_name, repo_full_name)

    # Bootstrap first admin on new project (or retry if user hadn't logged in yet)
    admin_email = (
        fm.get("admin_email")
        or (team_config.get("PM") or {}).get("email")
    )
    if admin_email:
        bootstrap_admin(supabase, project_id, admin_email)
    elif is_new:
        print(f"  ⚠ new project with no admin_email / team.PM.email — "
              f"add admin manually via SQL", file=sys.stderr)

    # Upsert tasks
    tasks = parse_tasks(body, team_config)
    print(f"  tasks: {len(tasks)}")
    for task in tasks:
        supabase.table("tasks_sync").upsert(
            {**task, "project_id": project_id},
            on_conflict="project_id,external_id",
        ).execute()

    # Upsert milestones
    milestones = parse_milestones(body)
    print(f"  milestones: {len(milestones)}")
    for ms in milestones:
        supabase.table("milestones").upsert(
            {**ms, "project_id": project_id},
            on_conflict="project_id,milestone_id",
        ).execute()

    # Update project phase from frontmatter
    phase = fm.get("phase")
    if phase:
        supabase.table("projects").update({"current_phase": phase}).eq("id", project_id).execute()

    print(f"  ✅ synced")


# ──────────────────────────────────────────
# Main
# ──────────────────────────────────────────

def main() -> None:
    repo_full_name = os.environ.get("GITHUB_REPOSITORY", "unknown/repo")
    supabase = get_supabase_client()

    # Find all WBS.md files (skip node_modules, .git, hidden dirs)
    repo_root = Path(".")
    wbs_files = [
        p for p in repo_root.rglob("WBS.md")
        if not any(part.startswith(".") or part == "node_modules" for part in p.parts)
    ]

    if not wbs_files:
        print("No WBS.md files found — nothing to sync")
        return

    print(f"Found {len(wbs_files)} WBS.md file(s)")

    errors = []
    for wbs_file in sorted(wbs_files):
        try:
            sync_wbs_file(supabase, wbs_file, repo_full_name)
        except Exception as e:
            errors.append((wbs_file, e))
            print(f"  ❌ ERROR: {e}", file=sys.stderr)

    if errors:
        print(f"\n{len(errors)} file(s) failed to sync", file=sys.stderr)
        sys.exit(1)

    print("\n✅ All WBS files synced successfully")


if __name__ == "__main__":
    main()
