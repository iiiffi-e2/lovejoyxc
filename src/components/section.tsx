import Link from "next/link";

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="text-sm font-semibold text-brand hover:text-brand-dark"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
