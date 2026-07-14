# V11 permanent board exclusions

- Disabled 4chan boards are removed from the board picker instead of shown as disabled buttons.
- After disabling the active board, the viewer automatically switches to the next available board.
- Previously disabled boards are respected during startup.
- The permanently excluded board is removed from every board list and rejected by catalog, thread, media, and board-control APIs even if Neon is reset or a URL is entered manually.
- Existing hidden database rows for permanently excluded boards are not exposed in the UI.
