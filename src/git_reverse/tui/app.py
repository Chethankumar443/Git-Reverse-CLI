"""
Git Reverse TUI Application.

Handles the keyboard-driven workspace interaction, async cloning and parsing,
and displays the sidebar session list and chat interactions.
"""

from __future__ import annotations

import asyncio
import uuid
from typing import ClassVar

from textual import on, work
from textual.app import App, ComposeResult
from textual.binding import Binding, BindingType
from textual.containers import Horizontal, Vertical
from textual.events import Resize
from textual.reactive import reactive
from textual.widgets import (
    Footer,
    Header,
    Input,
    Label,
    ListItem,
    ListView,
    ProgressBar,
    Static,
)

from git_reverse.analysis.pipeline import AnalysisPipeline
from git_reverse.config.settings import AppSettings
from git_reverse.core.logging import get_logger
from git_reverse.ingestion.cloner import RepositoryCloner
from git_reverse.ingestion.validator import RepositoryValidator
from git_reverse.storage.database import Database, Repository, RepositoryDAO, Session, SessionDAO
from git_reverse.tui.chat import ChatPane

log = get_logger(__name__)


# ── Home Screen / Welcome View ──
class HomeView(Vertical):
    """A minimalist home screen for Git Reverse."""

    def __init__(self, settings: AppSettings) -> None:
        super().__init__(id="welcome-content")
        self._settings = settings

    def compose(self) -> ComposeResult:
        yield Label("Git Reverse", id="home-title")
        name = self._settings.username
        tagline = f"Welcome back, {name}." if name != "" else "Understand any repository."
        yield Label(tagline, id="home-tagline")

        with Vertical(id="home-input-zone"):
            yield Input(
                placeholder="GitHub URL or local path — press Enter to analyse...",
                id="repo-input",
            )

        yield Label("Recent Sessions", id="home-recent-title")
        yield ListView(id="home-recent-list")
        yield Label("Ctrl+P  command palette   /  new session   Ctrl+Q  quit", id="home-hint")


# ── Ingestion / Analysis Pipeline View ──
class AnalysisView(Vertical):
    """Ingestion Pipeline progress view."""

    def __init__(self, repo_name: str = "") -> None:
        super().__init__(id="analysis-view")
        self._repo_name = repo_name
        self.progress_bar = ProgressBar(total=100, id="analysis-progress-bar")
        self.current_task = Label("", id="analysis-current-task")

    def compose(self) -> ComposeResult:
        if self._repo_name:
            yield Label(self._repo_name, id="analysis-repo-name")
        yield Label("Analysing Repository", id="analysis-title")
        yield self.progress_bar

        with Vertical(id="analysis-pipeline-stages"):
            yield Label("  Clone", classes="stage-item pending", id="stage-clone")
            yield Label("  AST Parse", classes="stage-item pending", id="stage-ast")
            yield Label("  Dependencies Index", classes="stage-item pending", id="stage-deps")
            yield Label("  Architecture Map", classes="stage-item pending", id="stage-arch")
            yield Label("  Knowledge Graph", classes="stage-item pending", id="stage-graph")
            yield Label("  AI Context Prep", classes="stage-item pending", id="stage-ai")

        yield self.current_task
        yield Label("L  toggle log output", id="analysis-log-toggle-tip")

        with Vertical(id="analysis-log-container"):
            yield ListView(id="analysis-log-view")

    def update_stage(self, stage_id: str, status: str, text: str | None = None) -> None:
        """Update checklist item style based on status."""
        _NAMES = {
            "clone": "Clone",
            "ast": "AST Parse",
            "deps": "Dependencies Index",
            "arch": "Architecture Map",
            "graph": "Knowledge Graph",
            "ai": "AI Context Prep",
        }
        _PREFIX = {
            "pending": "  ",
            "running": "▶ ",
            "complete": "✓ ",
            "failed": "✕ ",
        }
        import contextlib

        with contextlib.suppress(Exception):
            label = self.query_one(f"#stage-{stage_id}", Label)
            classes = f"stage-item {status}"
            label.set_classes(classes)
            plain_text = _NAMES.get(stage_id, stage_id)
            prefix = _PREFIX.get(status, "  ")
            label.update(f"{prefix}{plain_text}")

        if text:
            self.current_task.update(text)


class SessionListItem(ListItem):
    """ListItem representing a session in the sidebar with type-safe session_id attribute."""

    session_id: str


# ── Sidebar ───────────────────────────────────────────────────────────────────
class Sidebar(Vertical):
    """Left panel: session list and file explorer."""

    def compose(self) -> ComposeResult:
        yield Label("GIT REVERSE", id="sidebar-title")
        yield Label("Repository Files", id="file-tree-title")
        yield ListView(id="file-list")
        yield Label("Recent Sessions", id="session-list-title")
        yield ListView(id="session-list")

    def populate_sessions(self, sessions: list[Session]) -> None:
        """Render session list items from database records."""
        session_list = self.query_one("#session-list", ListView)
        session_list.clear()
        if not sessions:
            session_list.append(ListItem(Label("No sessions yet.", classes="session-item")))
            return
        for session in sessions:
            label = f"{session.id}  {session.mode}"
            item = SessionListItem(Label(label, classes="session-item"))
            item.session_id = session.id
            session_list.append(item)

    def populate_files(self, files: list[str]) -> None:
        """Populate repository file outline in sidebar."""
        file_list = self.query_one("#file-list", ListView)
        file_list.clear()

        file_tree_title = self.query_one("#file-tree-title", Label)
        if not files:
            file_tree_title.display = False
            file_list.display = False
            return

        file_tree_title.display = True
        file_list.display = True
        for f in files:
            file_list.append(ListItem(Label(f, classes="file-item")))


# ── Main Panel ────────────────────────────────────────────────────────────────
class MainPanel(Vertical):
    """Right panel: welcomes dashboard or chat view."""

    def __init__(self, db: Database, settings: AppSettings) -> None:
        super().__init__(id="main-panel")
        self._db = db
        self._settings = settings

    def compose(self) -> ComposeResult:
        yield HomeView(self._settings)
        analysis = AnalysisView()
        analysis.display = False
        yield analysis
        key = self._settings.get_openrouter_key() or ""
        chat_pane = ChatPane(self._db, key, self._settings.default_model)
        chat_pane.display = False
        yield chat_pane


# ── Status Bar ────────────────────────────────────────────────────────────────
class StatusBar(Static):
    """One-line status bar showing active context and transient messages."""

    repo_name: reactive[str] = reactive("no repository")
    model_name: reactive[str] = reactive("—")
    session_id: reactive[str] = reactive("—")
    message: reactive[str] = reactive("")

    def render(self) -> str:
        if self.message:
            return f"  [bold cyan]▶ {self.message}[/]"
        sep = "  ·  "
        return f"  [bold]{self.repo_name}[/]{sep}{self.model_name}{sep}{self.session_id}"

    def watch_message(self, message: str) -> None:
        """Clear temporary status message after 3 seconds."""
        if message:
            self.set_timer(3.0, self.clear_message)

    def clear_message(self) -> None:
        self.message = ""


# ── The Application ───────────────────────────────────────────────────────────
class GitReverseApp(App[None]):
    """The root Textual application for Git Reverse."""

    CSS_PATH = "styles.tcss"
    TITLE = "Git Reverse"
    SUB_TITLE = "Repository Intelligence Platform"

    BINDINGS: ClassVar[list[BindingType]] = [
        Binding("ctrl+p", "command_palette", "Command Palette", priority=True),
        Binding("ctrl+k", "global_search", "Search"),
        Binding("ctrl+l", "focus_input", "Focus Input"),
        Binding("ctrl+n", "new_session", "New Session"),
        Binding("ctrl+r", "resume_session", "Resume Session"),
        Binding("ctrl+s", "save_session", "Save"),
        Binding("ctrl+m", "switch_model", "Model"),
        Binding("ctrl+t", "toggle_theme", "Theme"),
        Binding("ctrl+b", "toggle_sidebar", "Toggle Sidebar"),
        Binding("ctrl+q", "quit", "Quit", priority=True),
        Binding("question_mark", "show_help", "Help", key_display="?"),
    ]

    def __init__(
        self,
        settings: AppSettings,
        db: Database,
        initial_session_id: str | None = None,
    ) -> None:
        super().__init__()
        self._settings = settings
        self._db = db
        self._session_dao = SessionDAO(db)
        self._repo_dao = RepositoryDAO(db)
        self.active_session_id: str | None = None
        self._initial_session_id = initial_session_id

    def notify(
        self,
        message: str,
        *,
        title: str = "",
        severity: str = "information",
        timeout: float = 3.0,
    ) -> None:
        """Override standard notify to display in status bar instead of popup toast."""
        try:
            status = self.query_one(StatusBar)
            status.message = message
        except Exception:
            super().notify(message, title=title, severity=severity, timeout=timeout)

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        with Horizontal(id="body"):
            yield Sidebar(id="sidebar")
            yield MainPanel(self._db, self._settings)
        yield StatusBar(id="status-bar")
        yield Footer()

    def on_mount(self) -> None:
        """Load initial data after the DOM is ready."""
        status = self.query_one(StatusBar)
        status.model_name = self._settings.default_model

        # Show Home view by default
        self.show_view("home")

        # Hide file list until a repository is loaded
        self.query_one(Sidebar).populate_files([])

        # Load requested initial session if specified
        if self._initial_session_id:
            self.run_worker(self._load_session_by_id(self._initial_session_id))
            self.run_worker(self._load_recent_sessions())
            self.set_interval(300, self._check_new_models)
            return

        # Check onboarding status
        if self._settings.username == "":
            from git_reverse.tui.onboarding import OnboardingScreen

            async def handle_onboarding_dismiss(result: None) -> None:
                if self._settings.username != "":
                    status.model_name = self._settings.default_model
                    self.show_view("home")
                    self.notify(
                        f"Welcome, {self._settings.username}. "
                        "Paste a GitHub URL or path to get started.",
                        severity="information",
                    )
                    self.run_worker(self._load_recent_sessions())

            self.push_screen(OnboardingScreen(self._settings), handle_onboarding_dismiss)
        else:
            self.run_worker(self._load_recent_sessions())

        # Set periodic free models checker (every 5 minutes)
        self.set_interval(300, self._check_new_models)

    def on_resize(self, event: Resize) -> None:
        """Handle terminal resize to toggle narrow/wide CSS classes."""
        self.set_class(event.size.width < 100, "-narrow")

    def show_view(self, view_name: str) -> None:
        """Show the specified view and hide others."""
        home = self.query_one(HomeView)
        analysis = self.query_one(AnalysisView)
        chat = self.query_one(ChatPane)

        home.display = view_name == "home"
        analysis.display = view_name == "analysis"
        chat.display = view_name == "chat"

        # Hide log container by default when switching to analysis view
        if view_name == "analysis":
            analysis.query_one("#analysis-log-container").display = False

    async def _check_new_models(self) -> None:
        """Background checker for newly launched free-tier models on OpenRouter."""
        key = self._settings.get_openrouter_key()
        if not key:
            return

        import json

        import httpx

        cache_file = self._settings.data_dir / "free_models_cache.json"
        cached_ids: set[str] = set()
        if cache_file.exists():
            import contextlib

            with contextlib.suppress(Exception):
                cached_ids = set(json.loads(cache_file.read_text(encoding="utf-8")))

        url = "https://openrouter.ai/api/v1/models"
        headers = {"Authorization": f"Bearer {key}"}
        import contextlib

        with contextlib.suppress(Exception):
            async with httpx.AsyncClient() as client:
                res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code == 200:
                models = res.json().get("data", [])
                current_free_ids = []
                new_models = []
                for m in models:
                    pricing = m.get("pricing", {})
                    prompt_cost = float(pricing.get("prompt") or 0.0)
                    completion_cost = float(pricing.get("completion") or 0.0)
                    if prompt_cost == 0.0 and completion_cost == 0.0:
                        m_id = m.get("id")
                        current_free_ids.append(m_id)
                        if cached_ids and m_id not in cached_ids:
                            new_models.append(m.get("name") or m_id)

                # Update cache file
                cache_file.write_text(json.dumps(current_free_ids), encoding="utf-8")

                # Notify user if new models found
                for new_m in new_models:
                    self.notify(
                        f"New free model launched: {new_m}! Check it out in settings.",
                        title="New Model Available",
                        severity="information",
                    )

    async def _load_recent_sessions(self) -> None:
        """Fetch recent sessions from SQLite and populate the sidebar."""
        try:
            sessions = await self._session_dao.list_recent(limit=15)
            self.query_one(Sidebar).populate_sessions(sessions)

            # Also populate Home recent list
            home_view = self.query_one(HomeView)
            home_list = home_view.query_one("#home-recent-list", ListView)
            home_list.clear()
            if not sessions:
                home_list.append(
                    ListItem(
                        Label("No recent sessions found.", classes="session-item"),
                        id="home-none",
                    )
                )
            else:
                for session in sessions:
                    label = f"{session.id} [{session.mode}]"
                    item = SessionListItem(Label(label, classes="session-item"))
                    item.session_id = session.id
                    home_list.append(item)
        except Exception as exc:
            log.error("failed_to_load_sessions", error=str(exc))

    @on(ListView.Selected, "#session-list")
    def on_session_selected(self, event: ListView.Selected) -> None:
        """Handle session list selection."""
        item = event.item
        if not item or item.id == "none":
            return

        if isinstance(item, SessionListItem):
            self.run_worker(self._load_session_by_id(item.session_id))

    @on(ListView.Selected, "#home-recent-list")
    def on_home_session_selected(self, event: ListView.Selected) -> None:
        """Handle session selection from home list."""
        item = event.item
        if not item or item.id == "home-none":
            return

        if isinstance(item, SessionListItem):
            self.run_worker(self._load_session_by_id(item.session_id))

    async def _load_session_by_id(self, session_id: str) -> None:
        """Switch to and display session by ID."""
        try:
            session = await self._session_dao.get_by_id(session_id)
            self.active_session_id = session.id

            status = self.query_one(StatusBar)
            status.session_id = session.id

            repo_name = "no repository"
            files = []
            if session.repo_id:
                repo = await self._repo_dao.get_by_id(session.repo_id)
                if repo:
                    repo_name = repo.name

                # Load repo files for sidebar tree
                query_sql = (
                    "SELECT file_path FROM nodes WHERE repo_id = ? "
                    "AND type = 'module' ORDER BY file_path"
                )
                async with self._db.conn.execute(query_sql, (session.repo_id,)) as cursor:
                    files = [row[0] for row in await cursor.fetchall()]

            status.repo_name = repo_name

            # Populate sidebar files
            self.query_one(Sidebar).populate_files(files)

            # Display Chat pane with session mode restored
            self.show_view("chat")
            chat_pane = self.query_one(ChatPane)
            chat_pane.set_session(session.id, session.repo_id, mode=session.mode)
            self.notify(f"Session {session.id}", severity="information")
        except Exception as exc:
            self.notify(f"Failed to load session: {exc}", severity="error")

    @on(Input.Submitted, "#repo-input")
    def on_repo_submitted(self, event: Input.Submitted) -> None:
        """Handle repository URL/path submission with optional trailing query."""
        val = event.value.strip()
        if not val:
            return
        event.input.clear()

        url, query = self._parse_repo_input(val)
        self._run_analysis_pipeline(url, query)

    def _parse_repo_input(self, value: str) -> tuple[str, str | None]:
        """
        Parse repo input string into a repository url/path and optional query.
        Example:
          "https://github.com/org/repo.git explain the architecture"
          -> ("https://github.com/org/repo.git", "explain the architecture")
        """
        parts = value.strip().split(maxsplit=1)
        if len(parts) == 2:
            first, rest = parts
            if (
                first.startswith(("http://", "https://", "git@", "ssh://"))
                or first.endswith(".git")
                or "/" in first
                or "\\" in first
            ):
                return first, rest
        return value.strip(), None

    @work(exclusive=True)
    async def _run_analysis_pipeline(
        self, url_or_path: str, initial_query: str | None = None
    ) -> None:
        """Clones, validates, and runs AST analysis pipeline in the background."""
        # Derive repo name early for display
        name = url_or_path.rstrip("/").split("/")[-1].replace(".git", "")

        # Rebuild AnalysisView with the repo name and swap in
        main_panel = self.query_one(MainPanel)
        old_analysis = self.query_one(AnalysisView)
        await old_analysis.remove()
        fresh_analysis = AnalysisView(repo_name=name)
        await main_panel.mount(fresh_analysis, after=self.query_one(HomeView))

        self.show_view("analysis")
        analysis_view = self.query_one(AnalysisView)
        log_view = self.query_one("#analysis-log-view", ListView)
        log_view.clear()

        # Reset stages UI
        for stage in ("clone", "ast", "deps", "arch", "graph", "ai"):
            analysis_view.update_stage(stage, "pending")

        # 1. Create a Repository record in DB
        repo_id = str(uuid.uuid4())
        name = url_or_path.rstrip("/").split("/")[-1].replace(".git", "")

        repo = Repository(
            id=repo_id,
            url=url_or_path,
            name=name,
            analysis_status="running",
        )
        await self._repo_dao.upsert(repo)

        # Helper progress report callback
        async def progress_cb(phase: str, completed: int, total: int, msg: str) -> None:
            # Map phases to active stages
            if phase in ("cloning", "clone"):
                analysis_view.update_stage("clone", "running", msg)
            elif phase == "detecting_languages":
                analysis_view.update_stage("clone", "complete")
                analysis_view.update_stage("ast", "running", msg)
            elif phase == "parsing":
                analysis_view.update_stage("clone", "complete")
                analysis_view.update_stage("ast", "running", msg)
            elif phase == "graphing":
                analysis_view.update_stage("clone", "complete")
                analysis_view.update_stage("ast", "complete")
                analysis_view.update_stage("deps", "running", "Indexing module imports...")
                await asyncio.sleep(0.2)
                analysis_view.update_stage("deps", "complete")
                analysis_view.update_stage("arch", "running", "Mapping architectural layers...")
                await asyncio.sleep(0.2)
                analysis_view.update_stage("arch", "complete")
                analysis_view.update_stage("graph", "running", msg)
            elif phase == "persisting":
                analysis_view.update_stage("graph", "complete")
                analysis_view.update_stage("ai", "running", msg)
            elif phase == "complete":
                analysis_view.update_stage("ai", "complete", msg)

            analysis_view.progress_bar.update(progress=completed)
            log_view.append(ListItem(Label(f"[{phase}] {msg}", classes="log-item")))
            log_view.scroll_end()

        try:
            # 2. Clone
            cloner = RepositoryCloner(
                cache_dir=self._settings.repos_cache_path,
                timeout_seconds=self._settings.clone_timeout_seconds,
            )
            local_path = await cloner.clone(
                url_or_path,
                repo_id=repo_id,
                progress_callback=progress_cb,
            )

            # 3. Validate
            validator = RepositoryValidator(max_repo_size_mb=self._settings.max_repo_size_mb)
            val_result = validator.validate(local_path)

            # Update Repository local_path in DB
            repo.local_path = str(local_path)
            await self._repo_dao.upsert(repo)

            # 4. Parse AST and Build Dependency Graph
            pipeline = AnalysisPipeline(db=self._db, max_workers=self._settings.effective_workers)
            await pipeline.run(
                repo_id=repo_id,
                validation_result=val_result,
                progress_callback=progress_cb,
            )

            # 5. Pipeline completed. Spawn a new session for this repository
            session = await self._session_dao.create(
                model=self._settings.default_model,
                mode="explore",
                repo_id=repo_id,
                username=self._settings.username if self._settings.username != "" else None,
            )

            # Switch view to new session
            await self._load_session_by_id(session.id)
            await self._load_recent_sessions()

            if initial_query:
                chat_pane = self.query_one(ChatPane)
                chat_pane.submit_query(initial_query)

        except Exception as exc:
            log.error("analysis_pipeline_failed", error=str(exc))
            await self._repo_dao.update_status(repo_id, "failed", error=str(exc))
            self.notify(f"Pipeline failed: {exc}", severity="error")
            self.show_view("home")

    # ── Actions ───────────────────────────────────────────────────────────────
    def action_focus_input(self) -> None:
        """Focus the input field in the active view."""
        chat_pane = self.query_one(ChatPane)
        if chat_pane.display:
            chat_pane.query_one("#chat-input").focus()
        else:
            home_view = self.query_one(HomeView)
            if home_view.display:
                home_view.query_one("#repo-input").focus()

    def action_global_search(self) -> None:
        """Perform a global fuzzy search or command trigger."""
        self.action_command_palette()

    def key_l(self) -> None:
        """Toggle detailed analysis logs on 'L' keypress."""
        import contextlib

        with contextlib.suppress(Exception):
            analysis_view = self.query_one(AnalysisView)
            if analysis_view.display:
                log_container = analysis_view.query_one("#analysis-log-container")
                log_container.display = not log_container.display

    async def action_new_session(self) -> None:
        """Create a new blank session and return to home view."""
        self.show_view("home")
        self.active_session_id = None
        status = self.query_one(StatusBar)
        status.session_id = "—"
        status.repo_name = "no repository"
        self.query_one(Sidebar).populate_files([])
        # Focus the input after the DOM settles
        self.call_after_refresh(lambda: self.query_one("#repo-input", Input).focus())

    def action_toggle_theme(self) -> None:
        """Toggle between dark and light themes."""
        self.theme = "textual-light" if self.theme == "textual-dark" else "textual-dark"

    def action_command_palette(self) -> None:
        """Show the command palette."""
        from git_reverse.tui.palette import CommandPalette

        def handle_cmd(cmd: str | None) -> None:
            if not cmd:
                return
            if cmd == "settings":
                self.action_switch_model()
            elif cmd == "theme":
                self.action_toggle_theme()
            elif cmd == "new_session":
                self.run_worker(self.action_new_session())
            elif cmd == "resume":
                self.run_worker(self.action_resume_session())
            elif cmd == "help":
                self.action_show_help()
            elif cmd == "quit":
                self.exit()

        self.push_screen(CommandPalette(), handle_cmd)

    def action_switch_model(self) -> None:
        """Open settings screen (which manages model & keyring configuration)."""
        from git_reverse.tui.settings import SettingsScreen

        async def handle_settings_dismiss(result: None) -> None:
            # Refresh default model in status bar and in the active chat pane
            new_model = self._settings.default_model
            self.query_one(StatusBar).model_name = new_model
            chat_pane = self.query_one(ChatPane)
            chat_pane.update_model(new_model)

            # Rebuild HomeView only if it is visible (avoids double-mount)
            home = self.query_one(HomeView)
            if home.display:
                main_panel = self.query_one(MainPanel)
                await home.remove()
                new_home = HomeView(self._settings)
                await main_panel.mount(new_home, before=self.query_one(AnalysisView))
                self.show_view("home")

        self.push_screen(SettingsScreen(self._settings), handle_settings_dismiss)

    async def action_resume_session(self) -> None:
        """Resume the most recent session."""
        try:
            sessions = await self._session_dao.list_recent(limit=1)
            if sessions:
                await self._load_session_by_id(sessions[0].id)
            else:
                self.notify("No sessions to resume.", severity="warning")
        except Exception as exc:
            self.notify(f"Resume failed: {exc}", severity="error")

    async def action_save_session(self) -> None:
        """Save the current session state."""
        self.notify("Session saved.", severity="information")

    def action_show_help(self) -> None:
        """Display a key bindings summary as a notification."""
        bindings = (
            "Ctrl+P  command palette\n"
            "Ctrl+B  toggle sidebar\n"
            "Ctrl+N  new session\n"
            "Ctrl+R  resume session\n"
            "Ctrl+M  settings\n"
            "Ctrl+L  focus input\n"
            "L       toggle log (analysis view)\n"
            "Tab     cycle chat mode\n"
            "Ctrl+Q  quit"
        )
        self.notify(bindings, title="Keyboard Shortcuts", severity="information", timeout=8)

    def action_toggle_sidebar(self) -> None:
        """Toggle the sidebar display collapsed state."""
        sidebar = self.query_one(Sidebar)
        sidebar.toggle_class("collapsed")
