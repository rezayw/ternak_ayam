import argparse
import dataclasses
import os
import sys
from typing import Callable, Dict, List, Optional, Sequence, Tuple

import requests
import yaml
from rich.console import Console
from rich.table import Table

console = Console()


@dataclasses.dataclass
class FileSpec:
    field: str
    path: str
    filename: Optional[str] = None
    content_type: Optional[str] = None


@dataclasses.dataclass
class Scenario:
    name: str
    description: str
    category: str
    severity: str
    method: str
    path: str
    data: Dict[str, str]
    cookies: Dict[str, str]
    headers: Dict[str, str]
    files: Sequence[FileSpec]
    expected_status: Sequence[int]
    validator: Optional[Callable[[requests.Response], Tuple[bool, str]]] = None


@dataclasses.dataclass
class Result:
    scenario: Scenario
    ok: bool
    status: int
    detail: str


class HttpClient:
    def __init__(self, base_url: str, default_headers: Dict[str, str], default_cookies: Dict[str, str]):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update(default_headers or {})
        self.session.cookies.update(default_cookies or {})

    def request(self, scenario: Scenario, timeout: int) -> requests.Response:
        url = f"{self.base_url}{scenario.path}"
        files = None
        file_handles = []
        if scenario.files:
            files = {}
            for spec in scenario.files:
                fh = open(spec.path, "rb")
                file_handles.append(fh)
                upload_name = spec.filename or os.path.basename(spec.path)
                files[spec.field] = (upload_name, fh, spec.content_type)
        try:
            response = self.session.request(
                method=scenario.method,
                url=url,
                data=scenario.data or None,
                files=files,
                cookies=scenario.cookies or None,
                headers=scenario.headers or None,
                timeout=timeout,
                allow_redirects=False,
            )
            return response
        finally:
            for fh in file_handles:
                fh.close()


def load_config(config_path: Optional[str]) -> Dict[str, Dict[str, str]]:
    if not config_path:
        return {"headers": {}, "cookies": {}, "base_url": None}
    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return {
        "headers": data.get("headers", {}) or {},
        "cookies": data.get("cookies", {}) or {},
        "base_url": data.get("base_url"),
    }


def status_match(expected: Sequence[int], actual: int) -> bool:
    return actual in expected


def run_scenario(client: HttpClient, scenario: Scenario, timeout: int, verbose: bool) -> Result:
    try:
        resp = client.request(scenario, timeout=timeout)
    except Exception as exc:  # pragma: no cover - network errors
        return Result(scenario, False, -1, f"Request error: {exc}")

    ok = status_match(scenario.expected_status, resp.status_code)
    expected_str = ",".join(str(code) for code in scenario.expected_status)
    detail_parts = [f"{scenario.method} {scenario.path}", f"status {resp.status_code}", f"expected {expected_str}"]

    if scenario.validator:
        custom_ok, custom_detail = scenario.validator(resp)
        ok = ok and custom_ok
        if custom_detail:
            detail_parts.append(custom_detail)

    if verbose:
        snippet = (resp.text or "").strip()
        if len(snippet) > 240:
            snippet = snippet[:240] + "..."
        if snippet:
            detail_parts.append(f"body: {snippet}")

    detail = "; ".join(detail_parts)

    return Result(scenario, ok, resp.status_code, detail)


def load_scenarios(payload_dir: str) -> List[Scenario]:
    payloads = {
        "malware": os.path.join(payload_dir, "malware.exe"),
        "evil": os.path.join(payload_dir, "evil.txt"),
        "image": os.path.join(payload_dir, "image.png"),
    }

    def validator_contains(keyword: str) -> Callable[[requests.Response], Tuple[bool, str]]:
        def _inner(resp: requests.Response) -> Tuple[bool, str]:
            ok = keyword.lower() in (resp.text or "").lower()
            return ok, f"body contains '{keyword}'" if ok else f"body missing '{keyword}'"

        return _inner

    def validator_not_contains(keyword: str) -> Callable[[requests.Response], Tuple[bool, str]]:
        def _inner(resp: requests.Response) -> Tuple[bool, str]:
            ok = keyword.lower() not in (resp.text or "").lower()
            return ok, f"body does not contain '{keyword}'" if ok else f"body leaked '{keyword}'"

        return _inner

    def validator_no_script(resp: requests.Response) -> Tuple[bool, str]:
        text = (resp.text or "").lower()
        ok = "<script" not in text
        return ok, "sanitized output" if ok else "script tag echoed"

    scenarios: List[Scenario] = [
        Scenario(
            name="auth_wrong_password",
            description="Login wrong password should be rejected",
            category="Authentication",
            severity="High",
            method="POST",
            path="/api/auth/login",
            data={"email": "admin@example.com", "password": "wrongpass", "csrf": "csrf-demo-token", "captcha": "42"},
            cookies={"csrf": "csrf-demo-token", "captcha": "captcha-demo-cookie"},
            headers={},
            files=[],
            expected_status=[400, 401],
        ),
        Scenario(
            name="auth_pending_status",
            description="Pending user should get PENDING_APPROVAL (403) or 400 with no approval yet",
            category="Authentication",
            severity="High",
            method="POST",
            path="/api/auth/login",
            data={"email": "pending@example.com", "password": "password123", "csrf": "csrf-demo-token", "captcha": "42"},
            cookies={"csrf": "csrf-demo-token", "captcha": "captcha-demo-cookie"},
            headers={},
            files=[],
            expected_status=[400, 403],
            validator=lambda resp: (True, "") if resp.status_code == 400 else validator_contains("PENDING_APPROVAL")(resp),
        ),
        Scenario(
            name="auth_bad_captcha",
            description="Captcha wrong should be 400",
            category="Authentication",
            severity="Medium",
            method="POST",
            path="/api/auth/login",
            data={"email": "admin@example.com", "password": "password123", "csrf": "csrf-demo-token", "captcha": "jawaban_salah"},
            cookies={"csrf": "csrf-demo-token", "captcha": "captcha-demo-cookie"},
            headers={},
            files=[],
            expected_status=[400],
        ),
        Scenario(
            name="auth_sqli_style",
            description="SQLi-style credential stuffing must fail",
            category="Authentication",
            severity="High",
            method="POST",
            path="/api/auth/login",
            data={"email": "admin@example.com' OR '1'='1", "password": "wrongpass", "csrf": "csrf-demo-token", "captcha": "42"},
            cookies={"csrf": "csrf-demo-token", "captcha": "captcha-demo-cookie"},
            headers={},
            files=[],
            expected_status=[400, 401],
        ),
        Scenario(
            name="csrf_missing_token",
            description="CSRF form without token should be rejected",
            category="CSRF",
            severity="High",
            method="POST",
            path="/api/farm/update",
            data={
                "totalChickens": "10",
                "healthyChickens": "9",
                "eggsToday": "5",
                "feedCost": "1000",
                "medicineCost": "500",
                "maintenanceCost": "500",
            },
            cookies={"session": "sess-admin-123"},
            headers={},
            files=[],
            expected_status=[403],
        ),
        Scenario(
            name="csrf_expired_token",
            description="Expired CSRF token should be rejected",
            category="CSRF",
            severity="High",
            method="POST",
            path="/api/farm/update",
            data={
                "totalChickens": "10",
                "healthyChickens": "9",
                "eggsToday": "5",
                "feedCost": "1000",
                "medicineCost": "500",
                "maintenanceCost": "500",
                "csrf": "csrf-old-123",
            },
            cookies={"session": "sess-admin-123", "csrf": "csrf-old-123"},
            headers={},
            files=[],
            expected_status=[403],
        ),
        Scenario(
            name="upload_malicious_exe",
            description="Upload .exe should be blocked by MIME validation",
            category="File Upload",
            severity="High",
            method="POST",
            path="/api/upload",
            data={"csrf": "csrf-demo-token"},
            cookies={"session": "sess-admin-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[FileSpec(field="file", path=payloads["malware"], filename="malware.exe", content_type="application/x-msdownload")],
            expected_status=[400, 403, 415],
        ),
        Scenario(
            name="upload_without_role",
            description="User role should not upload",
            category="File Upload",
            severity="High",
            method="POST",
            path="/api/upload",
            data={"csrf": "csrf-demo-token"},
            cookies={"session": "sess-user-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[FileSpec(field="file", path=payloads["image"], filename="image.png", content_type="image/png")],
            expected_status=[401, 403],
        ),
        Scenario(
            name="upload_path_traversal_name",
            description="Filename ../evil.sh must be stored safely",
            category="File Upload",
            severity="High",
            method="POST",
            path="/api/upload",
            data={"csrf": "csrf-demo-token"},
            cookies={"session": "sess-admin-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[FileSpec(field="file", path=payloads["evil"], filename="../evil.sh", content_type="text/plain")],
            expected_status=[200, 201, 202, 403],
            validator=validator_not_contains("../"),
        ),
        Scenario(
            name="upload_mime_spoof",
            description="MIME spoofed exe as png should be blocked",
            category="File Upload",
            severity="High",
            method="POST",
            path="/api/upload",
            data={"csrf": "csrf-demo-token"},
            cookies={"session": "sess-admin-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[FileSpec(field="file", path=payloads["malware"], filename="fake.png", content_type="image/png")],
            expected_status=[400, 403, 415],
        ),
        Scenario(
            name="access_idor_download",
            description="Staff B cannot access staff A file",
            category="Access Control",
            severity="High",
            method="GET",
            path="/api/download/demo-file-1",
            data={},
            cookies={"session": "sess-staffB-123"},
            headers={},
            files=[],
            expected_status=[401, 403],
        ),
        Scenario(
            name="access_user_escalation",
            description="User role cannot post farm update",
            category="Access Control",
            severity="High",
            method="POST",
            path="/api/farm/update",
            data={
                "totalChickens": "10",
                "healthyChickens": "9",
                "eggsToday": "5",
                "feedCost": "1000",
                "medicineCost": "500",
                "maintenanceCost": "500",
                "csrf": "csrf-demo-token",
            },
            cookies={"session": "sess-user-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[],
            expected_status=[302, 401, 403],
        ),
        Scenario(
            name="input_numeric_injection",
            description="Numeric field injection should be rejected",
            category="Input Validation",
            severity="Medium",
            method="POST",
            path="/api/farm/update",
            data={
                "totalChickens": "abc",
                "healthyChickens": "9",
                "eggsToday": "5",
                "feedCost": "1000",
                "medicineCost": "500",
                "maintenanceCost": "500",
                "csrf": "csrf-demo-token",
            },
            cookies={"session": "sess-admin-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[],
            expected_status=[400, 403, 422],
        ),
        Scenario(
            name="xss_notes_sanitization",
            description="Notes field should sanitize script tags",
            category="Input Validation",
            severity="High",
            method="POST",
            path="/api/farm/update",
            data={
                "totalChickens": "10",
                "healthyChickens": "9",
                "eggsToday": "5",
                "feedCost": "1000",
                "medicineCost": "500",
                "maintenanceCost": "500",
                "notes": "<script>alert('xss')</script>",
                "csrf": "csrf-demo-token",
            },
            cookies={"session": "sess-admin-123", "csrf": "csrf-demo-token"},
            headers={},
            files=[],
            expected_status=[400, 403, 422, 302],
            validator=validator_no_script,
        ),
    ]

    return scenarios


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Security checker for farm app")
    parser.add_argument("--base-url", default="http://localhost:4321", help="Target base URL")
    parser.add_argument("--config", help="Optional YAML config for headers/cookies/base_url")
    parser.add_argument("--timeout", type=int, default=10, help="HTTP timeout in seconds")
    parser.add_argument("--only", help="Comma-separated scenario names to run")
    parser.add_argument("--list", action="store_true", help="List scenarios and exit")
    parser.add_argument("--payload-dir", default=os.path.join(os.path.dirname(__file__), "..", "data", "payloads"), help="Directory containing payload files")
    parser.add_argument("--verbose", action="store_true", help="Print response body snippets")
    return parser.parse_args(argv)


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)
    config = load_config(args.config)
    base_url = config.get("base_url") or args.base_url

    scenarios = load_scenarios(os.path.abspath(args.payload_dir))
    if args.list:
        for sc in scenarios:
            console.print(f"- {sc.name}: {sc.description}")
        return 0

    only = set()
    if args.only:
        only = {name.strip() for name in args.only.split(",") if name.strip()}
        scenarios = [sc for sc in scenarios if sc.name in only]
        if not scenarios:
            console.print("[red]No scenarios match --only filter[/red]")
            return 1

    client = HttpClient(base_url=base_url, default_headers=config.get("headers", {}), default_cookies=config.get("cookies", {}))

    severity_order = {"High": 0, "Medium": 1, "Low": 2, "Info": 3}
    scenarios.sort(key=lambda sc: (severity_order.get(sc.severity, 99), sc.category, sc.name))

    table = Table(title="Security Checks", show_lines=False)
    table.add_column("No.")
    table.add_column("Scenario")
    table.add_column("Category")
    table.add_column("Severity")
    table.add_column("Result")
    table.add_column("Detail")

    category_totals: Dict[str, List[bool]] = {}
    passes = 0
    for idx, sc in enumerate(scenarios, start=1):
        res = run_scenario(client, sc, timeout=args.timeout, verbose=args.verbose)
        status_label = "PASS" if res.ok else "FAIL"
        color = "green" if res.ok else "red"
        table.add_row(str(idx), sc.name, sc.category, sc.severity, f"[{color}]{status_label}[/{color}]", res.detail)
        category_totals.setdefault(sc.category, []).append(res.ok)
        if res.ok:
            passes += 1

    summary = Table(title="Category Summary", show_lines=False)
    summary.add_column("Category")
    summary.add_column("Passed/Total")
    summary.add_column("Status")
    for cat, results in category_totals.items():
        cat_pass = sum(1 for r in results if r)
        cat_total = len(results)
        ok = cat_pass == cat_total
        color = "green" if ok else "yellow"
        summary.add_row(cat, f"{cat_pass}/{cat_total}", f"[{color}]{'OK' if ok else 'Needs attention'}[/{color}]")

    console.print(table)
    console.print(summary)
    console.print(f"Passed {passes}/{len(scenarios)} checks")
    return 0 if passes == len(scenarios) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
