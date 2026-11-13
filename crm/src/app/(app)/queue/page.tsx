import { Suspense } from "react";
import { Queue } from "./queue";

export default function QueuePage() {
  return (
    <Suspense>
      <Queue />
    </Suspense>
  );
}
