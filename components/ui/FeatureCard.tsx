interface FeatureCardProps {
    title: string
    description: string
    icon: string
  }
  
  export default function FeatureCard({ title, description, icon }: FeatureCardProps) {
    return (
      <div className="rounded-lg border border-border dark:border-foreground/30 p-6 hover:shadow transition">
        <h2 className="text-xl font-semibold mb-2">
          {icon} {title}
        </h2>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">
          {description}
        </p>
      </div>
    )
  }