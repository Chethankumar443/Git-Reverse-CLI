"""
TUI Command Palette.

Modal screen for quick command operations and fuzzy command searches.
"""

from __future__ import annotations

from typing import ClassVar

from textual import on
from textual.app import ComposeResult
from textual.binding import Binding, BindingType
from textual.containers import Container
from textual.screen import ModalScreen
from textual.widgets import Input, Label, ListItem, ListView

_COMMANDS = [
    ("settings", "Open configuration settings"),
    ("theme", "Toggle light / dark theme"),
    ("new_session", "Start a new exploration session"),
    ("resume", "Resume the last session"),
    ("help", "Show keyboard shortcuts"),
    ("quit", "Exit Git Reverse"),
]


class CommandListItem(ListItem):
    """ListItem representing a command with type-safe cmd_name attribute."""
    cmd_name: str


class CommandPalette(ModalScreen[str]):
    """Modal screen offering command search and quick triggers."""

    BINDINGS: ClassVar[list[BindingType]] = [
        Binding("escape", "dismiss_empty", "Close", priority=True),
    ]

    def compose(self) -> ComposeResult:
        with Container(id="palette-container"):
            yield Input(placeholder="Search commands...", id="palette-input")
            yield ListView(id="palette-list")

    def on_mount(self) -> None:
        self.query_one("#palette-input", Input).focus()
        self._populate_list("")

    def _populate_list(self, filter_text: str) -> None:
        list_view = self.query_one("#palette-list", ListView)
        list_view.clear()

        normalized = filter_text.strip().lower()
        for cmd, desc in _COMMANDS:
            if not normalized or normalized in cmd or normalized in desc.lower():
                # Single label: name padded to align with description
                padded_name = cmd.ljust(16)
                item = CommandListItem(
                    Label(f"{padded_name}  {desc}", classes="palette-item")
                )
                item.cmd_name = cmd
                list_view.append(item)

    def action_dismiss_empty(self) -> None:
        self.dismiss("")

    @on(Input.Changed, "#palette-input")
    def on_input_changed(self, event: Input.Changed) -> None:
        self._populate_list(event.value)

    @on(Input.Submitted, "#palette-input")
    def on_input_submitted(self, event: Input.Submitted) -> None:
        """Select highlighted item, or first match if any."""
        list_view = self.query_one("#palette-list", ListView)
        selected_item = list_view.highlighted_child
        if selected_item and isinstance(selected_item, CommandListItem):
            self.dismiss(selected_item.cmd_name)
            return
        # Fall back to first item
        for child in list_view.children:
            if isinstance(child, CommandListItem):
                self.dismiss(child.cmd_name)
                return
        self.dismiss("")

    @on(ListView.Selected, "#palette-list")
    def on_list_selected(self, event: ListView.Selected) -> None:
        if isinstance(event.item, CommandListItem):
            self.dismiss(event.item.cmd_name)
