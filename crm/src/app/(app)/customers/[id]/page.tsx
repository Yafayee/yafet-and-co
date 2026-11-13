import { notFound } from "next/navigation";
import { customerById, customers } from "@/lib/data";
import { Profile } from "./profile";

export function generateStaticParams() {
  return customers.map((c) => ({ id: c.id }));
}

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const customer = customerById(id);
  if (!customer) notFound();
  return <Profile id={id} />;
}
