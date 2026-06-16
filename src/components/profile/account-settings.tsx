import { SectionTitle } from "@/components/section";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { UpdateEmailForm } from "@/components/profile/update-email-form";

export function AccountSettings({
  name,
  email,
  avatarUrl,
  blobConfigured,
  showAvatar = true,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  blobConfigured: boolean;
  showAvatar?: boolean;
}) {
  return (
    <div className="space-y-6">
      {showAvatar ? (
        <div>
          <SectionTitle title="Account settings" />
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              <UserAvatar name={name} avatarUrl={avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="font-bold text-ink">{name}</p>
                <p className="truncate text-sm text-gray-500">{email}</p>
              </div>
            </div>
            <AvatarUpload
              avatarUrl={avatarUrl}
              blobConfigured={blobConfigured}
            />
          </Card>
        </div>
      ) : null}

      <div>
        <SectionTitle title="Email" />
        <Card className="p-5">
          <UpdateEmailForm currentEmail={email} />
        </Card>
      </div>

      <div>
        <SectionTitle title="Password" />
        <Card className="p-5">
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
