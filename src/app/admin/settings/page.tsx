import { requireRole } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob-config";
import { PageHeading } from "@/components/section";
import { AccountSettings } from "@/components/profile/account-settings";

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN");
  const blobConfigured = isBlobConfigured();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Settings"
        description="Manage your admin account."
      />
      <AccountSettings
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarUrl}
        blobConfigured={blobConfigured}
      />
    </div>
  );
}
