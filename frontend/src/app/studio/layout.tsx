import { AuthGuard } from "@/components/auth-guard";
import "@/styles/studio.css";
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
