# Tracker — UI Redesign Plan

Consolidated from our conversation. Goal: clean, minimal, **joyful** — a "music player" feel — without sacrificing legibility for a tool used all day.

## Design principles (LOCKED)
1. **Solid everything — no glass.** All cards *and* the floating chrome are solid, crisp editorial surfaces (the "Brain & Cognitive Health 21" treatment). Maximum legibility, timeless, no backdrop-blur anywhere.
2. **Changing, dimmed background.** A **curated abstract image set** rotates "every now and then," always behind a soft scrim so cards pop.
3. **Legibility first.** Because the background changes, never rely on it for contrast.
4. **Project thumbnails = pasted URL** for now (upload-to-Storage later).
5. **Start by mocking the shell**, approve, then build.

## The shell (global layout)
```
┌──────────────────────────────────────────────────────────────────┐
│  ☰              ╭─  Today  |  Time  ─╮                        ⊕    │
│  hamburger          floating toggle               green circular +
├──────────────────────────────────────────────────┬───────────────┤
│                                                    │  ✦ Chat    ⟨  │
│   Today (cards)   ·or·   Time (weekly grid)        │   rail,       │
│                                                    │   collapsible │
│                                                    │  [paste box]  │
└────────────────────────────────────────────────────┴───────────────┘
        (rotating, dimmed background behind everything)
```
- **☰ Hamburger** (top-left) → Clients, Projects, Reports, Invoices, Categories, Settings, + a link to the Today summary.
- **Today | Time** floating toggle = the ONLY primary nav.
- **⊕ green circular +** (top-right) = quick add (start timer / new task — same action).
- **Right chat rail** = the AI capture + conversation, expand/collapse.

## The two main views
- **Today = cards only** (a login briefing): capacity-meter Brief, Focus shortlist, Coming up. **No chat here** (chat lives in the rail). A button jumps to Time.
- **Time = the default home**: the existing weekly grid (which already looks great) becomes the home and **also shows scheduled tasks alongside tracked time**. The separate **Plan tab is removed/merged** — no more duplicate week grid.

## The task card — "21" treatment
Solid card filled with the task's data:
```
[thumb] Realize.com · Mobile — Home page
07:12                         ← big metric (tracked, or progress)
├───────────────●─────────────┤
est 3h                     over
```
- **Project thumbnail replaces the colored dot.** Each Project gets a `thumbnail`; tasks **inherit** it (fallback to the dot if none).
- Thumbnails stored as **URLs / Supabase Storage refs, never base64 in the data blob** (base64 images are part of what bloated/broke storage).

## AI chat rail (right)
- Collapsible panel. Holds the paste box (text + image).
- **Conversational triage:** on paste, AI replies *"Filing these under Realize.com — ok?"* with **Confirm / Correct (pick project) / type back** buttons, so it can't file tasks into the wrong project.
- The conversation/buttons UI is built in the redesign; the real AI behind it is **Step 2** (Claude vision via `/api/ai` + Anthropic key).

## What we reuse (not throwaway)
The data model (`ScheduledTask`, project links, capacity helpers in `planner.ts`) and the **TaskDrawer** all carry over. The redesign mostly re-homes things: capture box → rail; Plan agenda → inside the Time grid; Today → cards-only.

## Build phases (each shippable)
1. **Shell** — hamburger + floating Today/Time toggle + green +; move other pages under the hamburger; default route = Time. Merge Plan into Time.
2. **Right chat rail** — collapsible; move the capture box here (AI stubbed).
3. **Today = cards-only** briefing (drop its docked composer).
4. **Task "21" cards + project thumbnails** (model: `project.thumbnail`; UI: solid editorial card).
5. **Background rotation (dimmed) + frosted chrome** styling pass.
6. **Step 2 AI** — conversational project-assignment triage in the rail.

## Open decisions to lock before building
- **Frosted vs solid** — recommendation: solid content + frosted chrome. Confirm.
- **Tasks in the Time grid** — show as cards inside each day column? a lane under the time strip?
- **Background images** — your own photography, a curated abstract set, or generated gradients?
- **Project thumbnails** — upload-to-Storage now, or paste-a-URL for now and add upload later?

## Recommended start
**Phase 1 (shell)** — it's the scaffolding everything hangs on and instantly makes the app feel new. Mock it first, then build.
