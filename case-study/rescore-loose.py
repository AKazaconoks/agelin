"""
Post-hoc re-score the bench JSONs with looser, semantically-equivalent
assertions. The original task assertions are deliberately strict (regex
matches against canonical phrasing). Loose assertions match the
underlying concept regardless of word order, markdown formatting, or
synonym choice.

Run after both bench JSONs exist:
  python case-study/rescore-loose.py

Outputs the side-by-side numbers under both scoring modes.
"""

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
BEFORE = ROOT / "case-study/results/before.json"
AFTER = ROOT / "case-study/results/after.json"

# For each task, list of (regex, flags) groups that count as a hit if
# ANY group's regex appears in the output. The output also has to contain
# at least N (typically 2) of these groups for "loose pass".
LOOSE_RULES = {
    "so-11227809-sorted-array-faster": [
        r"branch[\s-]?predict",
        r"(misprediction|wrong\s+predict|pipeline\s+(flush|stall))",
        r"(predictable|consistent(ly)?)",
    ],
    "so-111102-javascript-closures": [
        r"(lexical|enclosing)\s+(scope|environment)",
        r"(captures?|closes\s+over|remembers|access(es)?)\s+(variables?|state|environment|scope)",
        r"inner\s+function|nested\s+function|returned\s+function",
        r"after.*outer.*(returned|finished|exited)",
    ],
    "so-762011-let-vs-var": [
        r"block[\s-]?scope",
        r"function[\s-]?scope",
        r"(temporal\s+dead\s+zone|tdz)",
        r"hoist",
    ],
    "so-523643-equality-operators": [
        r"(coerc|conver(t|sion))",
        r"strict",
        r"(prefer|use|recommend|safer|always).*===",
        r"===.*(prefer|recommend|safer|stricter|preferred)",
    ],
    "so-1335851-use-strict": [
        r"strict\s+mode",
        r"(throws|errors\s+out|fails\s+loudly|silent\s+errors|silently)",
        r"(undeclared|implicit(ly)?\s+global)",
        r"this.*(undefined|not.*global)",
    ],
    "so-1132941-mutable-default-arg": [
        r"(default.*evaluated|created|defined).*once",
        r"(shared|same).*(across|between)\s+calls",
        r"None\b.*\bdefault|default.*None",
        r"if\s+\w+\s+is\s+None",
    ],
    "so-132988-is-vs-equals-python": [
        r"(value|content)s?\s+equal|equality",
        r"identity|same\s+object|reference\s+(equality|same)",
        r"is\s+None",
        r"singleton",
    ],
    "so-231767-python-yield": [
        r"generator",
        r"(lazy|on[- ]demand|on\s+request|one\s+at\s+a\s+time)",
        r"(pause|suspend|resume)",
        r"iterator",
    ],
    "so-200469-process-vs-thread": [
        r"(separate|own|isolated|distinct).*(memory|address\s+space)",
        r"(share|shared).*(memory|address\s+space|heap)",
        r"(own|separate).*stack",
        r"(context\s+switch|lighter|heavier|cheaper|expensive)",
    ],
    "so-487258-big-o": [
        r"(worst[- ]?case|upper[- ]?bound)",
        r"(asymptot|grow|scal|patter)",
        r"(input\s+size|n\s+items?|n\s+elements?|amount\s+of\s+data|more\s+data)",
        r"(constant|lower[- ]order)\s+(factor|term)",
    ],
    "so-927358-undo-git-commit": [
        r"git\s+reset",
        r"--(soft|mixed|hard)",
        r"HEAD[\^~]",
        r"(staging|index|working\s+(tree|directory))",
    ],
    "so-38549-inner-vs-outer-join": [
        r"(only|just).*(match|matching).*rows?",
        r"(left|right|full|outer).*(all|every).*rows?",
        r"\bnull\b",
        r"no\s+match",
    ],
    "so-107390-post-vs-put": [
        r"idempoten",
        r"(put|PUT).*(idempot|same\s+result|same\s+state|safe.*retry)",
        r"(post|POST).*(create|new\s+resource|not\s+idempot)",
        r"(repeat|multiple|same).*(create|generates?).*new",
    ],
    "so-3297048-401-vs-403": [
        r"401.*(authent|credentials|not\s+logged)",
        r"403.*(authoriz|permission|forbidden|access\s+den)",
        r"(authent.*authoriz|credentials.*permission)",
    ],
    "so-52499617-npm-install-vs-ci": [
        r"package[- ]?lock",
        r"(strict|exact|reproducib|deterministic|consistent)",
        r"(ci|continuous\s+integration|production|build)",
        r"(delete|wipe|remove|fresh|clean).*node_modules",
    ],
    "so-114543-center-element": [
        r"margin\s*:\s*(0\s+)?auto",
        r"(display\s*:\s*flex|justify-content\s*:\s*center)",
        r"(width|max-width)",
    ],
    "so-2003505-delete-git-branch": [
        r"git\s+branch\s+-[dD]",
        r"git\s+push.*(--delete|origin\s+:|--prune|-d\s+origin)",
        r"(unmerged|force|capital\s+d|fully\s+merged)",
    ],
    "so-509211-python-slice-notation": [
        r"start.*stop.*step",
        r"(stop|end|second).*exclus|exclus.*(stop|end)",
        r"negative",
        r"\[::-1\]",
    ],
    "so-1789945-string-contains-substring": [
        r"\.includes\s*\(",
        r"\.indexOf\s*\(",
    ],
    "so-419163-name-equals-main": [
        r"(run|execut|invoke).*(directly|as.*script|command\s+line)",
        r"import",
        r"(__main__|module\s+name)",
    ],
}

# How many LOOSE_RULES patterns must fire for a "loose pass".
MIN_HITS = 2


def loose_score(task_id: str, output: str) -> bool:
    rules = LOOSE_RULES.get(task_id)
    if not rules:
        return False
    text = output.lower()
    hits = sum(1 for pat in rules if re.search(pat, text, flags=re.IGNORECASE))
    return hits >= MIN_HITS


def analyze(path: Path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    strict_pass = 0
    loose_pass = 0
    timeouts = 0
    total = 0
    per_agent = defaultdict(lambda: {"strict": 0, "loose": 0, "total": 0})
    per_task_loose = defaultdict(lambda: {"pass": 0, "total": 0})
    for agent in data["results"]:
        for r in agent.get("benchResults", []):
            total += 1
            per_agent[agent["agentName"]]["total"] += 1
            per_task_loose[r["taskId"]]["total"] += 1
            if r["success"]:
                strict_pass += 1
                per_agent[agent["agentName"]]["strict"] += 1
            if "duration budget" in r.get("failureReason", ""):
                timeouts += 1
            # Loose pass: either strict pass OR loose-rules match
            if r["success"] or loose_score(r["taskId"], r.get("output", "")):
                loose_pass += 1
                per_agent[agent["agentName"]]["loose"] += 1
                per_task_loose[r["taskId"]]["pass"] += 1
    return {
        "strict_pass": strict_pass,
        "loose_pass": loose_pass,
        "timeouts": timeouts,
        "total": total,
        "per_agent": dict(per_agent),
        "per_task_loose": dict(per_task_loose),
    }


before = analyze(BEFORE)
after = analyze(AFTER)

print("=== STRICT (regex-literal) ===")
print(f"  pass     {before['strict_pass']:3d}/{before['total']}  ->  {after['strict_pass']:3d}/{after['total']}  delta={after['strict_pass']-before['strict_pass']:+d}")
print(f"  timeouts {before['timeouts']:3d}      ->  {after['timeouts']:3d}      delta={after['timeouts']-before['timeouts']:+d}")

print()
print("=== LOOSE (concept-match, >= 2 hits) ===")
print(f"  pass     {before['loose_pass']:3d}/{before['total']}  ->  {after['loose_pass']:3d}/{after['total']}  delta={after['loose_pass']-before['loose_pass']:+d}")

print()
print("=== Per-agent (loose) ===")
for name in before["per_agent"]:
    b = before["per_agent"][name]
    a = after["per_agent"][name]
    print(f"  {name:25s}  before={b['loose']:2d}/{b['total']}  after={a['loose']:2d}/{a['total']}  delta={a['loose']-b['loose']:+d}")

print()
print("=== Per-task loose pass rate ===")
sorted_tasks = sorted(before["per_task_loose"].keys())
for tid in sorted_tasks:
    b = before["per_task_loose"][tid]
    a = after["per_task_loose"][tid]
    delta = a["pass"] - b["pass"]
    print(f"  {tid:50s}  before={b['pass']}/{b['total']}  after={a['pass']}/{a['total']}  delta={delta:+d}")
