import { useAuth } from "@/contexts/AuthContext";

const roleTitles: Record<string, string> = {
  dealer_owner: "Dealer Owner",
  operations_manager: "Operations Manager",
  brand_ambassador: "Brand Ambassador",
  finance: "Finance",
};

export default function PlaceholderPage({ title }: { title: string }) {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground">
        This page is under construction for the {roleTitles[user?.role || ""] || ""} role.
      </p>
      <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <p className="text-foreground font-medium">Coming Soon</p>
        <p className="text-sm text-muted-foreground mt-1">This feature is being built</p>
      </div>
    </div>
  );
}
