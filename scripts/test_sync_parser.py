"""
Unit tests for WBS parser functions (covers WBS item 3.2.6: edge case testing).
Run: python scripts/test_sync_parser.py
"""

import sys
import unittest

sys.path.insert(0, str(__file__).rsplit("/", 1)[0])
from sync_wbs_to_supabase import parse_frontmatter, parse_task_line, parse_tasks, parse_milestones


class TestParseFrontmatter(unittest.TestCase):
    def test_valid_frontmatter(self):
        content = "---\nproject: Test\ndoc_type: WBS\n---\n# Body"
        fm, body = parse_frontmatter(content)
        self.assertEqual(fm["project"], "Test")
        self.assertEqual(fm["doc_type"], "WBS")
        self.assertIn("# Body", body)

    def test_no_frontmatter_returns_empty_dict(self):
        content = "# No frontmatter here\nsome content"
        fm, body = parse_frontmatter(content)
        self.assertEqual(fm, {})
        self.assertIn("No frontmatter", body)

    def test_invalid_yaml_returns_empty_dict(self):
        content = "---\ninvalid: {unclosed: [\n---\n# Body"
        fm, body = parse_frontmatter(content)
        self.assertEqual(fm, {})


class TestParseTaskLine(unittest.TestCase):
    def test_unchecked_task(self):
        r = parse_task_line("- [ ] M1.1.1 Build login page [owner:: FE:Alice] #2026-06-10")
        self.assertIsNotNone(r)
        self.assertEqual(r["external_id"], "M1.1.1")
        self.assertEqual(r["status"], "Todo")
        self.assertEqual(r["title"], "Build login page")
        self.assertEqual(r["deadline"], "2026-06-10")

    def test_checked_task(self):
        r = parse_task_line("- [x] M2.3 Deploy [owner:: DevOps:Bob]")
        self.assertEqual(r["status"], "Done")

    def test_blocked_tag(self):
        r = parse_task_line("- [ ] M3.1 Fix bug [owner:: BE:Carol] #2026-06-15 #blocked")
        self.assertEqual(r["yaml_data"], {"blocked": True})

    def test_no_owner(self):
        r = parse_task_line("- [ ] M1.1 Task without owner")
        self.assertIsNotNone(r)
        self.assertIsNone(r["assignee_role"])
        self.assertIsNone(r["assignee_name"])

    def test_non_task_lines_return_none(self):
        self.assertIsNone(parse_task_line("## Section Header"))
        self.assertIsNone(parse_task_line("- [ ] No task ID here"))
        self.assertIsNone(parse_task_line("Some random text"))

    def test_no_deadline_is_none(self):
        r = parse_task_line("- [ ] M5.1 No deadline [owner:: FE:Alice]")
        self.assertIsNone(r["deadline"])


class TestParseTasks(unittest.TestCase):
    def test_empty_body_returns_empty_list(self):
        self.assertEqual(parse_tasks("", {}), [])

    def test_duplicate_task_ids_both_parsed(self):
        body = "- [ ] M1.1 First task\n- [x] M1.1 Duplicate id"
        tasks = parse_tasks(body, {})
        self.assertEqual(len(tasks), 2)

    def test_wbs_path_includes_section_headers(self):
        body = "## 4.0 Frontend\n### 4.3 Domain Logic\n- [ ] M4.3.1 Calc progress"
        tasks = parse_tasks(body, {})
        self.assertEqual(len(tasks), 1)
        self.assertIn("4.0 Frontend", tasks[0]["wbs_path"])
        self.assertIn("4.3 Domain Logic", tasks[0]["wbs_path"])

    def test_email_resolved_from_team_config(self):
        body = "- [ ] M1.1 Task [owner:: FE:Alice]"
        team = {"FE": {"email": "alice@example.com"}}
        tasks = parse_tasks(body, team)
        self.assertEqual(tasks[0]["assignee_email"], "alice@example.com")

    def test_unknown_role_has_no_email(self):
        body = "- [ ] M1.1 Task [owner:: Unknown:Bob]"
        tasks = parse_tasks(body, {})
        self.assertIsNone(tasks[0]["assignee_email"])


class TestParseMilestones(unittest.TestCase):
    SAMPLE = (
        "\n## 里程碑\n\n"
        "| 里程碑 | 名稱 | 計劃日期 | 實際日期 | 狀態 |\n"
        "|--------|------|----------|----------|------|\n"
        "| M1 | 基礎建設完成 | 2026-06-13 | 2026-06-13 | 完成 |\n"
        "| M2 | 認證完成 | 2026-06-20 |  | 進行中 |\n"
        "| M3 | PM MVP | 2026-06-27 |  |  |\n"
        "\n## Next Section\n"
    )

    def test_parses_three_milestones(self):
        ms = parse_milestones(self.SAMPLE)
        self.assertEqual(len(ms), 3)

    def test_completed_milestone(self):
        ms = {m["milestone_id"]: m for m in parse_milestones(self.SAMPLE)}
        self.assertTrue(ms["M1"]["is_completed"])
        self.assertEqual(ms["M1"]["planned_date"], "2026-06-13")

    def test_incomplete_milestone(self):
        ms = {m["milestone_id"]: m for m in parse_milestones(self.SAMPLE)}
        self.assertFalse(ms["M2"]["is_completed"])

    def test_empty_actual_date_is_none(self):
        ms = {m["milestone_id"]: m for m in parse_milestones(self.SAMPLE)}
        self.assertIsNone(ms["M2"]["actual_date"])

    def test_no_milestone_section_returns_empty(self):
        body = "## 其他章節\nsome content"
        self.assertEqual(parse_milestones(body), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
