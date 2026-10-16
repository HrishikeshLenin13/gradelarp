# gradelarp

A grade dashboard and planner built around Home Access Center.

Connect your school's HAC account to see its reported averages and assignments. Use a separate manual profile for what-if calculations, GPA planning, and anything you want to track yourself. Gradelarp doesn't write changes back to your school.

## Run locally

You'll need Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) for the cinematic landing page, then choose **Open app**. The workspace and HAC sign-in are at [localhost:3000/app](http://localhost:3000/app). Choose a district or its official HAC address; manual entry remains available. Both pages share one origin, so existing browser records are preserved.

The landing's **Grades** and **What-if calculator** links open the existing tools directly. The closing section also links to GPA and assignment planning. A first visit shows HAC sign-in; after sign-in or manual entry, the selected destination stays selected.

| Workspace | URL |
| --- | --- |
| Overview / sign-in | `/app` |
| Grades and assignments | `/app#courses` |
| What-if calculator | `/app#whatif` |
| GPA planner | `/app#gpa` |
| Grade history | `/app#trends` |
| Assignment planner | `/app#planner` |
| Academic tools | `/app#academics` |
| HAC connection | `/app#hac` |
| Data and backups | `/app#data` |

The 3D loading screen includes an **Open app without waiting** link, so entering the workspace does not depend on WebGL or the cinematic bundle finishing. Tool URLs survive refresh and browser Back/Forward. A blank manual what-if profile offers **Add your first course**, using the existing course editor and calculation engine. School-source profiles keep their read-only records; creating a manual planning profile from what-if or GPA keeps that tool open.

If `localhost:3000` opens a different local project, check the server address. IPv4 and IPv6 listeners can make that address ambiguous. Use a free dedicated port instead: `npm run dev -- --port 3004`, then open [127.0.0.1:3004](http://127.0.0.1:3004/). Browser storage is origin-specific: `localhost` and `127.0.0.1` do not share records. Stay on the origin where you saved your grades, or export and import a JSON backup when moving between them.


## What's here

- HAC sign-in, saved school records, refresh, and disconnect
- School course/assignment search, attention filters and source CSV export
- Synced pending assignments in the planner, with raw dates preserved when incomplete
- Bounded school-reported average history and stale/partial-sync notices
- Course and assignment tracking
- What-if scenarios and a configurable GPA calculator
- Planner, schedules, attendance notes, contacts, and goals
- Multiple profiles, themes, and JSON backups

HAC support is still being tested against different district setups. Some schools require SSO or extra verification. An unfamiliar response leaves saved grades alone and shows a diagnostic rather than filling in made-up values. School-reported averages stay separate from manual calculations.

## Data

Academic records are saved in your browser. The server keeps the school session in memory while you're connected; it doesn't save your HAC password. Clearing browser storage removes local records, so export a backup if you need one.

Backups contain school information. Keep them private and out of Git.

## Development

```sh
npm run check
```

This runs lint, type checks, unit tests, and a production build. For browser tests, start the built app in one terminal:

```sh
npm run start -- --port 3002
```

Then, in another:

```sh
PW_BROWSER_CHANNEL=chrome PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e
```

The Chrome channel uses the installed browser for GPU-backed landing tests. The tests use isolated fixtures. They don't prove that a particular district account has synced successfully. Connector details are in [HAC_INTEGRATION.md](HAC_INTEGRATION.md).

## History

The local project predates this repository. Its saved source checkpoints were imported into Git; [the history notes](docs/history.md) explain the reconstruction and dates.

## The landing

Scroll down to move through the study-desk scene. The camera follows a continuous path, and the gradebook uses textured cloth, curved paper, metal bindings and soft studio lighting. The photographs are real and credited in the page.

**3D controls** lets you rotate the gradebook, open the cover and switch pages with a keyboard or touch. **Reset view** returns to the scroll-driven pose. Motion settles instead of running a permanent animation loop, and reduced-motion preferences are respected.

In the app, choose **Any other HAC district** to enter a district's official portal if it isn't one of the quick picks.
