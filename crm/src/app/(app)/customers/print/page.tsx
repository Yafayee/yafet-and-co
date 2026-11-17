import { Suspense } from "react";
import { Summary } from "./summary";

export default function PrintPage() {
  return (
    <Suspense>
      <Summary />
    </Suspense>
  );
}
