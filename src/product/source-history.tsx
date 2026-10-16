import type { Profile } from "./model";
export function SourceHistory({ profile }: { profile: Profile }) {
  const source = profile.hacLive!;
  const points = source.history.length
    ? source.history
    : [
        {
          fetchedAt: source.snapshot.fetchedAt,
          term: source.snapshot.term,
          status: source.snapshot.status,
          courses: source.snapshot.courses,
        },
      ];
  return (
    <section className="panel product-source-history">
      <h2>School-reported grade history</h2>
      <p className="helper">
        Recorded from successful HAC syncs. Unchanged averages do not create
        duplicate points. Personal grade estimates are not included.
      </p>
      {points.length < 2 && (
        <p className="hac-notice">
          One real snapshot is available. Sync again after school-reported
          grades change to build your history.
        </p>
      )}
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Recorded school grade changes</caption>
          <thead>
            <tr>
              <th scope="col">Recorded</th>
              <th scope="col">Term</th>
              <th scope="col">School-reported marks</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point, i) => (
              <tr key={`${point.fetchedAt}/${i}`}>
                <td>{new Date(point.fetchedAt).toLocaleString()}</td>
                <td>
                  {point.term || "Not reported"}
                  {point.status === "partial" && (
                    <span className="helper"> · Partial sync</span>
                  )}
                </td>
                <td>
                  <ul>
                    {point.courses.map((course) => (
                      <li key={course.id}>
                        <strong>{course.name}</strong>
                        <span>
                          {course.averageText || "Not reported"}
                          {course.stale ? " · Saved earlier" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
