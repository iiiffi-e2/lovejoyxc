import Link from "next/link";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob-config";
import { parentPath } from "@/lib/parent-access";
import { removeSelfFromAthlete } from "@/app/actions/parent";
import { PageHeading, SectionTitle } from "@/components/section";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { AccountSettings } from "@/components/profile/account-settings";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ParentProfilePage() {
  const user = await requireRole("PARENT");
  const blobConfigured = isBlobConfigured();

  const links = await prisma.parentAthleteLink.findMany({
    where: { parentId: user.id },
    include: { athlete: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Profile"
        description="Your parent account and linked athletes."
      />

      <AccountSettings
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarUrl}
        blobConfigured={blobConfigured}
        showAvatar={false}
      />

      <div>
        <SectionTitle title="Linked athletes" />
        {links.length > 0 ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={link.athlete.name}
                    avatarUrl={link.athlete.avatarUrl}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-ink">{link.athlete.name}</p>
                    <p className="text-xs text-gray-400">
                      Linked {formatDate(link.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={parentPath("/parent/dashboard", link.athlete.id)}>
                      View log
                    </Link>
                  </Button>
                  <form action={removeSelfFromAthlete.bind(null, link.athlete.id)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            title="No linked athletes"
            description="Accept an invite from your athlete or coach to get started."
          />
        )}
      </div>
    </div>
  );
}
