import FeatureCard from '../ui/FeatureCard'

export default function DashboardGrid() {
  const features = [
    {
      title: "Import Conversations",
      description: "Upload chat exports from your favorite AI tools and organize them into projects.",
      icon: "📂"
    },
    {
      title: "Smart Suggestions", 
      description: "Our built-in AI assistant will soon help you summarize and connect ideas across sessions.",
      icon: "🤖"
    },
    {
      title: "Dashboard View",
      description: "View and filter conversations by source, date, topic, or project context.",
      icon: "📊"
    },
    {
      title: "Knowledge Insights",
      description: "Coming soon: AI-powered insights that highlight patterns and contradictions across tools.",
      icon: "🧠"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {features.map((feature, index) => (
        <FeatureCard
          key={index}
          title={feature.title}
          description={feature.description}
          icon={feature.icon}
        />
      ))}
    </div>
  )
}