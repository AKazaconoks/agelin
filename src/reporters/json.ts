/**
 * JSON reporter. Pretty-prints the full ReportContext so machine consumers
 * (CI, dashboards) get every field.
 */

import type { ReportContext, Reporter } from "../types.js";

const jsonReporter: Reporter = {
  name: "json",
  render(ctx: ReportContext): string {
    return JSON.stringify(ctx, null, 2);
  },
};

export default jsonReporter;
