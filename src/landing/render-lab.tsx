"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  chapterOpacity,
  chapterStops,
  clamp,
  type StudyState,
} from "./study-state";
const Scene = dynamic(() => import("./gradebook-scene"), {
  ssr: false,
  loading: () => null,
});
function subscribe(listener: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function snapshot() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function RenderLab() {
  const root = useRef<HTMLElement>(null);
  const runway = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const context = useRef<gsap.Context | null>(null);
  const invalidator = useRef<(() => void) | null>(null);
  const state = useRef<StudyState>({
    progress: 0,
    stack: 1,
    pointerX: 0,
    pointerY: 0,
    reduced: true,
    yaw: 0,
    cover: null,
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [variant, setVariant] = useState(1);
  const [inspect, setInspect] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [coverPosition, setCoverPosition] = useState<number | null>(null);
  const reduced = useSyncExternalStore(subscribe, snapshot, () => true);
  const registerInvalidate = useCallback((fn: () => void) => {
    invalidator.current = fn;
    fn();
  }, []);
  const markReady = useCallback(() => setReady(true), []);
  const markFailure = useCallback(() => {
    setFailed(true);
    setReady(true);
  }, []);
  useLayoutEffect(() => {
    state.current.reduced = reduced;
    invalidator.current?.();
  }, [reduced]);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.to(state.current, {
        progress: 1,
        ease: "none",
        scrollTrigger: {
          trigger: runway.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
          invalidateOnRefresh: true,
        },
        onUpdate: () => {
          const p = state.current.progress;
          const element = root.current;
          if (!element) return;
          const brand =
            element.querySelector<HTMLButtonElement>(".compact-brand");
          if (brand) {
            brand.tabIndex = p > 0.03 ? 0 : -1;
            brand.setAttribute("aria-hidden", String(p <= 0.03));
          }
          element.dataset.progress = p.toFixed(4);
          element.style.setProperty("--intro", String(1 - clamp(p / 0.035)));
          element.style.setProperty("--p", String(p));
          element.style.setProperty(
            "--desk",
            String(1 - clamp((p - 0.014) / 0.025)),
          );
          element.style.setProperty("--photo", String(chapterOpacity(p, 4)));
          element.style.setProperty(
            "--spread",
            String(clamp((p - 0.54) / 0.2)),
          );
          element.style.setProperty(
            "--form-x",
            `${-35 - clamp((p - 0.15) / 0.16) * 25}%`,
          );
          let active = 0;
          let greatest = 0;
          element
            .querySelectorAll<HTMLElement>("[data-chapter]")
            .forEach((panel, index) => {
              const opacity = chapterOpacity(p, index);
              panel.style.setProperty("--opacity", String(opacity));
              panel.style.setProperty(
                "--offset",
                `${reduced ? 0 : (1 - opacity) * 28}px`,
              );
              if (opacity > greatest) {
                active = index;
                greatest = opacity;
              }
              panel.inert = opacity < 0.4;
              panel.setAttribute("aria-hidden", String(opacity < 0.4));
            });
          element.dataset.chapter = String(active);
          element
            .querySelectorAll<HTMLElement>("[data-navigation]")
            .forEach((button) =>
              button.setAttribute(
                "aria-current",
                String(
                  Number(button.dataset.navigation) ===
                    (p < 0.35 ? 0 : p < 0.54 ? 1 : p < 0.74 ? 2 : 3),
                ),
              ),
            );
          const bar = element.querySelector<HTMLElement>(".side-rail i");
          if (bar) bar.style.transform = `scaleY(${p})`;
          invalidator.current?.();
        },
      });
    }, root);
    context.current = ctx;
    return () => {
      ctx.revert();
      context.current = null;
    };
  }, [reduced]);
  function goTo(progress: number) {
    const area = runway.current;
    if (!area) return;
    const start = area.getBoundingClientRect().top + scrollY;
    window.scrollTo({
      top: start + (area.offsetHeight - innerHeight) * progress,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  function chooseStack(count: number) {
    setVariant(count);
    context.current?.add(() =>
      gsap.to(state.current, {
        stack: count,
        duration: reduced ? 0 : 0.7,
        ease: "power2.out",
        onUpdate: () => {
          if (root.current)
            root.current.dataset.stack = state.current.stack.toFixed(3);
          invalidator.current?.();
        },
      }),
    );
  }
  function adjustModel(yaw: number, cover: number | null) {
    setRotation(yaw);
    setCoverPosition(cover);
    state.current.yaw = (yaw * Math.PI) / 180;
    state.current.cover = cover;
    invalidator.current?.();
  }
  function pointer(event: PointerEvent<HTMLElement>) {
    if (
      reduced ||
      event.pointerType === "touch" ||
      (event.target as Element).closest("button,a,input")
    )
      return;
    state.current.pointerX = event.clientX / innerWidth - 0.5;
    state.current.pointerY = event.clientY / innerHeight - 0.5;
    invalidator.current?.();
  }
  return (
    <main
      className="gradelarp-study"
      ref={root}
      data-testid="study"
      data-ready={String(ready)}
      data-webgl={failed ? "unavailable" : ready ? "ready" : "loading"}
      data-progress="0"
      data-stack="1"
      data-chapter="0"
      data-reduced-motion={String(reduced)}
      onPointerMove={pointer}
    >
      <div className="story-runway" ref={runway}>
        <div className="story-viewport">
          <div
            className="scene-host"
            aria-label="Interactive student gradebook with report pages on a study desk"
          >
            <Scene
              state={state}
              registerInvalidate={registerInvalidate}
              onReady={markReady}
              onFailure={markFailure}
            />
          </div>
          <div className="film-grain" aria-hidden="true" />
          <div className="atmosphere" aria-hidden="true" />
          <header className="study-header">
            <button
              className="compact-brand"
              tabIndex={-1}
              aria-label="Gradelarp, return to intro"
              onClick={() => goTo(0)}
            >
              gradelarp
            </button>
            <span className="origin-dot" aria-hidden="true" />
            <nav aria-label="Chapters">
              {["Overview", "Features", "Your day", "Explore"].map(
                (name, index) => (
                  <button
                    key={name}
                    data-navigation={index}
                    aria-current={index === 0 ? "true" : "false"}
                    onClick={() => goTo([0, 0.43, 0.65, 0.83][index])}
                  >
                    {name}
                  </button>
                ),
              )}
              <button
                aria-expanded={inspect}
                aria-controls="gradebook-controls"
                onClick={() => setInspect(!inspect)}
              >
                3D controls
              </button>
              <Link href="/app" prefetch={false}>
                Open app
              </Link>
            </nav>
            <button
              className="mobile-menu"
              onClick={() => dialog.current?.showModal()}
              aria-label="About this study"
            >
              ＋
            </button>
          </header>
          {inspect && (
            <fieldset className="scene-controls" id="gradebook-controls">
              <legend>Make it your angle</legend>
              <p>
                Turn the gradebook, open its cover and explore its pages. Scroll
                normally to keep going.
              </p>
              <label>
                Rotate gradebook
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="1"
                  value={rotation}
                  aria-valuetext={`${rotation} degrees`}
                  onChange={(e) =>
                    adjustModel(Number(e.target.value), coverPosition)
                  }
                />
              </label>
              <label>
                Open cover
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={coverPosition ?? 0}
                  aria-valuetext={
                    coverPosition === null
                      ? "Follows scrolling"
                      : `${coverPosition} percent open`
                  }
                  onChange={(e) =>
                    adjustModel(rotation, Number(e.target.value))
                  }
                />
              </label>
              <div
                className="scene-control-pages"
                role="group"
                aria-label="Gradebook page"
              >
                {["Grades", "Assignments", "Planner"].map((name, index) => (
                  <button
                    key={name}
                    aria-pressed={variant === index + 1}
                    onClick={() => {
                      chooseStack(index + 1);
                      adjustModel(rotation, 100);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="scene-control-actions">
                <button
                  onClick={() => {
                    adjustModel(0, null);
                    chooseStack(1);
                  }}
                >
                  Reset view
                </button>
                <button onClick={() => setInspect(false)}>Done</button>
              </div>
            </fieldset>
          )}
          <aside className="side-rail" aria-hidden="true">
            <span>●</span> YOUR ACADEMIC LIFE
            <i />
          </aside>
          <article
            className="story-copy opening"
            data-chapter="0"
            aria-labelledby="opening-title"
          >
            <p className="opening-caption">
              Your grades, assignments, and next steps.
            </p>
            <h1 id="opening-title">gradelarp</h1>
            <div className="opening-description">
              <h2>
                Your grades.
                <br />
                Made clearer.
              </h2>
              <p>
                Bring your HAC gradebook into focus.
                <br />
                See courses and assignment details.
              </p>
              <Link className="landing-enter" href="/app" prefetch={false}>
                Open Gradelarp ↗
              </Link>
            </div>
            <div className="opening-credit">
              <strong>
                Less guesswork.
                <br />
                More direction.
              </strong>
              <div>
                <span>The details behind your average.</span>
                <p>
                  Reported marks.
                  <br />
                  Assignment breakdowns.
                </p>
              </div>
            </div>
            <button
              className="opening-preview"
              onClick={() => {
                goTo(0.075);
                setInspect(true);
              }}
            >
              <span className="thumbnail-book">g</span>
              <strong>
                Explore
                <br />
                your gradebook <span>↗</span>
              </strong>
            </button>
          </article>
          <article
            className="story-copy statement"
            data-chapter="1"
            aria-hidden="true"
            inert
          >
            <h2>
              Every course.
              <br />
              Every assignment.
              <br />
              One place.
            </h2>
            <p>
              Your school-reported averages, with assignment details close at
              hand.
            </p>
          </article>
          <article
            className="story-copy portable"
            data-chapter="2"
            aria-hidden="true"
            inert
          >
            <div className="diagram-frame" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <div className="diagram-circle" />
            </div>
            <p>
              More than
              <br />
              an average.
            </p>
            <h2>
              Find what
              <br /> needs focus.
            </h2>
            <span className="spec-label">
              Reported marks stay reported.
              <br />
              Missing details stay unknown.
            </span>
          </article>
          <article
            className="story-copy precision"
            data-chapter="3"
            aria-hidden="true"
            inert
          >
            <p>Your school portal. A student-friendly view.</p>
            <h2>
              Your HAC.
              <br />A clearer
              <br />
              view.
            </h2>
            <div className="source-diagram" aria-hidden="true">
              <span>School portal</span>
              <i />
              <span>Your gradebook</span>
              <i />
              <span>Assignment details</span>
            </div>
            <div className="precision-notes">
              <span>Connect a compatible HAC portal.</span>
              <span>See your school’s reported averages.</span>
              <span>Keep original assignment marks visible.</span>
            </div>
          </article>
          <article
            className="story-copy editorial"
            data-chapter="4"
            aria-hidden="true"
            inert
          >
            <h2>
              Know your
              <br />
              next priority.
            </h2>
            <div className="photo-spread">
              <figure className="study-photo writing">
                <Image
                  unoptimized
                  src="/photos/study-writing.jpg"
                  width="1600"
                  height="1201"
                  alt="A real fountain pen writing in a lined notebook"
                />
                <figcaption>
                  Plan the work ahead.{" "}
                  <a
                    href="https://unsplash.com/photos/pen-on-white-lined-paper-selective-focus-photography-CKlHKtCJZKk"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photo: Aaron Burden / Unsplash
                  </a>
                </figcaption>
              </figure>
              <figure className="study-photo books">
                <Image
                  unoptimized
                  src="/photos/library-books.jpg"
                  width="1400"
                  height="931"
                  alt="A real stack of colorful school books photographed by Kimberly Farmer"
                />
                <figcaption>
                  Keep every course in view.{" "}
                  <a
                    href="https://unsplash.com/photos/shallow-focus-photography-of-books-lUaaKCUANVI"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photo: Kimberly Farmer / Unsplash
                  </a>
                </figcaption>
              </figure>
            </div>
            <p>
              Review the work behind the mark.
              <br />
              Then get back to learning.
            </p>
          </article>
          <article
            className="story-copy products"
            data-chapter="5"
            aria-hidden="true"
            inert
          >
            <div>
              <p>Grades. Assignments. A plan.</p>
              <h2>
                Go from
                <br />
                checking
                <br /> to planning.
              </h2>
              <div
                className="product-options"
                role="group"
                aria-label="Explore Gradelarp tools"
              >
                {["Grades", "Assignments", "Planner"].map((name, index) => (
                  <button
                    key={name}
                    aria-pressed={variant === index + 1}
                    onClick={() => chooseStack(index + 1)}
                  >
                    {name}
                    <span>↗</span>
                  </button>
                ))}
              </div>
              <p className="product-description">
                {
                  [
                    "See courses, school-reported averages and available source details in one place.",
                    "Review individual marks, missing work and category details to see the bigger picture.",
                    "Plan tasks and goals. Use manual profiles for what-if grades and GPA with your own grading rules.",
                  ][variant - 1]
                }
              </p>
            </div>
            <div className="product-facts">
              <span>
                HAC records<strong>School-reported</strong>
              </span>
              <span>
                Planning<strong>Your own rules</strong>
              </span>
            </div>
          </article>
          <article
            className="story-copy closing"
            data-chapter="6"
            aria-hidden="true"
            inert
          >
            <h2>
              Know where
              <br />
              you stand.
            </h2>
            <p>
              School-reported grades, assignment details and personal planning.
              One workspace, built around the student.
            </p>
            <div className="closing-actions">
              <Link className="landing-enter" href="/app" prefetch={false}>
                Open Gradelarp ↗
              </Link>
              <button className="text-button" onClick={() => goTo(0)}>
                Replay
              </button>
              <button
                className="text-button"
                onClick={() => dialog.current?.showModal()}
              >
                About Gradelarp
              </button>
            </div>
            <div className="closing-word">gradelarp</div>
          </article>
          <button
            className="scroll-cue"
            onClick={() => {
              const p = state.current.progress;
              goTo(chapterStops.find((value) => value > p + 0.02) ?? 0);
            }}
          >
            <span>⌄</span>Scroll to continue
          </button>
          <button
            className="study-disclosure"
            onClick={() => dialog.current?.showModal()}
          >
            About & photo credits
          </button>
          {!ready && (
            <div className="loading-scene" role="status">
              <strong>gradelarp</strong>
              <span>Loading experience</span>
            </div>
          )}
        </div>
      </div>
      <dialog
        ref={dialog}
        className="study-dialog"
        aria-labelledby="study-title"
      >
        <button
          className="dialog-close"
          aria-label="Close preview information"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <span>ABOUT GRADELARP</span>
        <h2 id="study-title">
          Your grades.
          <br />
          Your next steps.
        </h2>
        <p>
          Gradelarp brings your school-reported grades and personal planning
          into one local-first workspace. Open the app to connect a compatible
          HAC portal or enter your own courses. The 3D gradebook is a concept
          illustration, not an application screenshot or a student record.
        </p>
        <p>
          The photographs are real, credited Unsplash photography: a fountain
          pen and notebook by Aaron Burden, and school books by Kimberly Farmer.
          No AI-generated photographs are used.
        </p>
        <a href="/photos/CREDITS.txt" target="_blank" rel="noreferrer">
          Photo sources and license
        </a>
        <a
          href="https://unsplash.com/photos/shallow-focus-photography-of-books-lUaaKCUANVI"
          target="_blank"
          rel="noreferrer"
        >
          Kimberly Farmer’s original photograph ↗
        </a>
        <a
          href="https://unsplash.com/photos/pen-on-white-lined-paper-selective-focus-photography-CKlHKtCJZKk"
          target="_blank"
          rel="noreferrer"
        >
          Aaron Burden’s photography ↗
        </a>
      </dialog>
    </main>
  );
}
