import { Suspense } from "react";
import { CustomerList } from "./list";

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomerList />
    </Suspense>
  );
}
