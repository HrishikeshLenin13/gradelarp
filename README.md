# gradelarp

A grade dashboard and planner built around Home Access Center.

Connect your school's HAC account to see its reported averages and assignments. Use a separate manual profile for what-if calculations, GPA planning, and anything you want to track yourself. Gradelarp doesn't write changes back to your school.

## Run locally

You'll need Node.js 22 or newer and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose your district, or enter its official HAC address, then sign in. You can also skip HAC and enter courses manually.

## What's here

- HAC sign-in, saved school records, refresh, and disconnect
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
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e
```

The tests use isolated fixtures. They don't prove that a particular district account has synced successfully. Connector details are in [HAC_INTEGRATION.md](HAC_INTEGRATION.md).

## History

The local project predates this repository. Its saved source checkpoints were imported into Git; [the history notes](docs/history.md) explain the reconstruction and dates.
