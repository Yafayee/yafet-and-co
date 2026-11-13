import { Gate } from "@/components/gate";
import { Shell } from "@/components/shell";
import { StoreProvider } from "@/lib/store";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <StoreProvider>
      <Gate>
        <Shell>{children}</Shell>
      </Gate>
    </StoreProvider>
  );
}
