"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check, CornerDownRight } from "lucide-react";
import { directionInfo, directions } from "./types";
import styles from "./comparison.module.css";
export function DesignComparison() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          gradelarp.
        </Link>
        <span>
          <Check size={14} />
          Your original workspace is unchanged
        </span>
        <Link href="/">
          Open original app
          <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div>
            <p>Design laboratory</p>
            <h1>
              A new perspective.
              <br />
              Three distinct directions.
            </h1>
          </div>
          <p>
            Same grades. Same trusted calculations.
            <br />A different way to understand your semester.
            <br />
            <span>Explore the working previews, then choose a direction.</span>
          </p>
        </div>
        <div className={styles.concepts}>
          {directions.map((direction) => (
            <article className={styles.concept} key={direction}>
              <Link
                href={`/design-lab/${direction}`}
                className={styles.preview}
                aria-label={`Open ${directionInfo[direction].name} preview`}
              >
                <div
                  className={styles.previewCanvas}
                  data-style={direction}
                  aria-hidden="true"
                >
                  {direction === "precision" ? (
                    <PrecisionMini />
                  ) : direction === "expressive" ? (
                    <ExpressiveMini />
                  ) : (
                    <KineticMini />
                  )}
                  <span className={styles.openIndicator}>
                    <ArrowUpRight size={18} />
                  </span>
                </div>
              </Link>
              <div className={styles.conceptHeader}>
                <h2>{directionInfo[direction].name}</h2>
                <span>
                  {direction === "precision"
                    ? "Focused & precise"
                    : direction === "expressive"
                      ? "Tactile & editorial"
                      : "Spatial & interactive"}
                </span>
              </div>
              <h3>{directionInfo[direction].tagline}</h3>
              <p>{directionInfo[direction].description}</p>
              <div className={styles.details}>
                {direction === "precision" ? (
                  <>
                    <span>Ledger-first hierarchy</span>
                    <span>Category evidence at hand</span>
                  </>
                ) : direction === "expressive" ? (
                  <>
                    <span>One meaningful focal point</span>
                    <span>Next-score intelligence</span>
                  </>
                ) : (
                  <>
                    <span>Grade-to-target score map</span>
                    <span>Selection-led workbench</span>
                  </>
                )}
              </div>
              <Link
                href={`/design-lab/${direction}`}
                className={styles.reviewLink}
              >
                Explore {directionInfo[direction].name}
                <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
        <section className={styles.compareSection}>
          <div>
            <h2>What changes between the directions?</h2>
            <p>
              Not a theme switch. Three different information architectures.
            </p>
          </div>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label="Design comparison"
          >
            <table>
              <thead>
                <tr>
                  <th>Student need</th>
                  <th>Precision</th>
                  <th>Expressive</th>
                  <th>Kinetic</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>How am I doing?</th>
                  <td>A complete course ledger</td>
                  <td>A focused course story</td>
                  <td>Every course positioned against its target</td>
                </tr>
                <tr>
                  <th>What should I focus on?</th>
                  <td>Below-target courses and category evidence</td>
                  <td>A next-assignment score spotlight</td>
                  <td>A linked course workbench and deadline runway</td>
                </tr>
                <tr>
                  <th>How does it feel?</th>
                  <td>Calm, compact, instrument-like</td>
                  <td>Personal, editorial, tactile</td>
                  <td>Exploratory, spacious, context-led</td>
                </tr>
                <tr>
                  <th>What can I try?</th>
                  <td>Inspect categories, edit scores, calculate</td>
                  <td>Switch subjects, test the next score</td>
                  <td>Select a lane, inspect goals, plan work</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div className={styles.note}>
          <CornerDownRight size={21} />
          <div>
            <h2>Explore without affecting your real workspace.</h2>
            <p>
              Each concept starts with clearly labeled demo data and keeps its
              edits and appearance preferences in a separate preview database.
              The approved Expressive application now lives at{" "}
              <Link href="/">/</Link>. Preview edits here never update real
              student profiles.
            </p>
          </div>
        </div>
        <footer className={styles.footer}>
          <span>gradelarp. / Design exploration</span>
          <span>Expressive approved. Local references only.</span>
        </footer>
      </main>
    </div>
  );
}
function PrecisionMini() {
  return (
    <div className={styles.precisionMini}>
      <aside>
        <b>g.</b>
        <i />
        <i />
        <i />
        <i />
      </aside>
      <section>
        <div className={styles.miniHead}>
          <b>Semester overview</b>
          <span>4.42 GPA</span>
        </div>
        {[
          ["Calculus AB", "94.9"],
          ["English Literature", "91.7"],
          ["Chemistry", "89.5"],
          ["U.S. History", "96.3"],
          ["Spanish III", "93.7"],
        ].map(([name, value]) => (
          <div className={styles.miniLedger} key={name}>
            <span>{name}</span>
            <i />
            <b>{value}%</b>
          </div>
        ))}
        <div className={styles.miniEvidence}>
          <div>
            <b>Category evidence</b>
            <i />
            <i />
          </div>
          <div>
            <b>Upcoming work</b>
            <span>Lab: reaction rates</span>
            <span>Unit 4 assessment</span>
          </div>
        </div>
      </section>
    </div>
  );
}
function ExpressiveMini() {
  return (
    <div className={styles.expressiveMini}>
      <aside>
        <b>g.</b>
        <i />
        <i />
        <i />
      </aside>
      <section>
        <div className={styles.miniHead}>
          <b>One course needs your attention.</b>
          <span>4.42</span>
        </div>
        <div className={styles.miniStory}>
          <div>
            <small>Honors / Chemistry</small>
            <b>
              Honors
              <br />
              Chemistry
            </b>
            <strong>
              89.5<small>%</small>
            </strong>
            <i />
            <span>Explore a what-if</span>
          </div>
          <section>
            <span>Your next move</span>
            <b>Lab: reaction rates</b>
            <strong>
              94.23<small>%</small>
            </strong>
            <p>Score needed to reach 90%</p>
          </section>
        </div>
        <div className={styles.miniSubjects}>
          {["Calculus", "English", "Chemistry", "History"].map((s, i) => (
            <span key={s}>
              {s}
              <b>{[94.9, 91.7, 89.5, 96.3][i]}%</b>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
function KineticMini() {
  return (
    <div className={styles.kineticMini}>
      <header>
        <b>gradelarp.</b>
        <span>Overview / Courses / Planner</span>
      </header>
      <div className={styles.miniHead}>
        <b>Your semester, positioned.</b>
        <span>4.42 GPA</span>
      </div>
      <div className={styles.miniMap}>
        <div className={styles.miniAxis}>
          <span>70</span>
          <span>80</span>
          <span>90</span>
          <span>100</span>
        </div>
        {[
          ["Calculus", 94.9],
          ["English", 91.7],
          ["Chemistry", 89.5],
          ["History", 96.3],
        ].map(([n, v]) => (
          <div key={n}>
            <span>{n}</span>
            <i>
              <b style={{ left: `${((Number(v) - 70) / 30) * 88}%` }} />
              {n === "Chemistry" && <strong>89.5%</strong>}
            </i>
          </div>
        ))}
      </div>
      <div className={styles.miniWorkBench}>
        <b>Chemistry workbench</b>
        <span>0.5 points to target</span>
        <i />
      </div>
    </div>
  );
}
