import { Card, CardContent } from './ui/card'

// Never render a bare "nothing here" — every list/collection page should show
// an EmptyState with a next step (usually the create action) when it has no
// data yet.

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        {Icon && <Icon className="size-8 text-muted-foreground" />}
        <p className="font-medium">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </CardContent>
    </Card>
  )
}
