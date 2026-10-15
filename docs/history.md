# Development history

This project was imported into Git on October 15, 2026. The working folder had no existing Git repository. Seven saved source checkpoints cover the earlier dashboard, redesign, manual workspace, and HAC connector work from October 13–15.

The first 500 commits reconstruct the changes in those checkpoints and the repository setup. They are not recovered original Git commits. Each commit changes the tree; there are no empty activity commits. Configuration files, lockfiles, and documents are imported as whole changes. Larger source and test changes are separated into diff blocks.

Historical author dates come from the file-modification timestamps preserved in the archives. Committer dates record the import. These timestamps establish when saved files were last modified, not the precise time every individual edit was written. Commit bodies identify the source checkpoint and archive hash.

Checkpoint tags mark the recovered complete source snapshots. Intermediate reconstruction commits are archival steps and aren't individually guaranteed to build. Use `main` for the current app.

[checkpoints.json](checkpoints.json) lists the source archives, hashes, and recorded dates. Generated builds, dependencies, browser state, raw request files, local verification bundles, and third-party research checkouts are kept out of the repository. The final source includes the app, tests, configuration, and project documentation.
