import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  title: string;
  description: string;
  badge?: string;
};

export const PageHeader = ({ title, description, badge }: PageHeaderProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {badge ? (
          <Badge variant="outline" className="border-primary text-primary">
            {badge}
          </Badge>
        ) : null}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
