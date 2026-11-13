import { Suspense } from "react";
import { Profile } from "./profile";

export default function CustomerPage() {
  return (
    <Suspense>
      <Profile />
    </Suspense>
  );
}
