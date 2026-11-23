import type { ReactNode } from "react";
/** Staff top strip: display title on the left, at most one primary action on the right. */
export function PageHead({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="page-head"><h1>{title}</h1>{action && <div>{action}</div>}</div>;
}
