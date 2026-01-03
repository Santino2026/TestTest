import { type ReactNode } from 'react';
import { PageHeader } from './PageHeader';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageTemplateProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
}

export function PageTemplate({
  title,
  subtitle,
  action,
  breadcrumbs,
  children,
}: PageTemplateProps) {
  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={action}
        breadcrumbs={breadcrumbs}
      />
      {children}
    </div>
  );
}
