import { RenderLab } from "./render-lab";
import styles from "./landing.module.css";
export function LandingPage() {
  return (
    <div className={styles.shell}>
      <RenderLab />
    </div>
  );
}
