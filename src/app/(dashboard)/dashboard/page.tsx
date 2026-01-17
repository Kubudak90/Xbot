import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your X automation activities
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Tweets"
          value="128"
          description="+12 this week"
          trend="up"
        />
        <StatsCard
          title="Scheduled"
          value="5"
          description="Next in 2 hours"
          trend="neutral"
        />
        <StatsCard
          title="Style Score"
          value="87%"
          description="Above average"
          trend="up"
        />
        <StatsCard
          title="Success Rate"
          value="98.4%"
          description="Last 30 days"
          trend="up"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you can perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">+</span>
              Generate New Tweet
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">🎯</span>
              Analyze Style
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">📅</span>
              Schedule Tweet
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <span className="mr-2">⚙️</span>
              Configure AI Providers
            </Button>
          </CardContent>
        </Card>

        {/* Recent Tweets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tweets</CardTitle>
            <CardDescription>
              Your latest generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RecentTweet
              content="Just discovered an amazing way to improve code quality..."
              status="posted"
              time="2 hours ago"
            />
            <RecentTweet
              content="Thread: Here are 5 tips for better TypeScript..."
              status="scheduled"
              time="In 4 hours"
            />
            <RecentTweet
              content="Working on something exciting! Stay tuned for updates..."
              status="draft"
              time="Draft"
            />
          </CardContent>
        </Card>
      </div>

      {/* AI Provider Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Provider Status</CardTitle>
          <CardDescription>
            Active providers and their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ProviderStatus
              name="OpenAI GPT-4"
              status="active"
              usage={65}
              priority={1}
            />
            <ProviderStatus
              name="Claude Sonnet"
              status="active"
              usage={30}
              priority={2}
            />
            <ProviderStatus
              name="Gemini Pro"
              status="inactive"
              usage={0}
              priority={3}
            />
            <ProviderStatus
              name="Ollama Local"
              status="active"
              usage={5}
              priority={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({
  title,
  value,
  description,
  trend,
}: {
  title: string
  value: string
  description: string
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {trend === 'up' && <span className="text-green-500">↑</span>}
        {trend === 'down' && <span className="text-red-500">↓</span>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function RecentTweet({
  content,
  status,
  time,
}: {
  content: string
  status: 'posted' | 'scheduled' | 'draft'
  time: string
}) {
  const statusColors = {
    posted: 'success',
    scheduled: 'warning',
    draft: 'secondary',
  } as const

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{content}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
      <Badge variant={statusColors[status]}>{status}</Badge>
    </div>
  )
}

function ProviderStatus({
  name,
  status,
  usage,
  priority,
}: {
  name: string
  status: 'active' | 'inactive'
  usage: number
  priority: number
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 min-w-[180px]">
        <div
          className={`h-2 w-2 rounded-full ${
            status === 'active' ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="flex-1">
        <Progress value={usage} className="h-2" />
      </div>
      <span className="text-xs text-muted-foreground w-12">{usage}%</span>
      <Badge variant="outline" className="w-16 justify-center">
        P{priority}
      </Badge>
    </div>
  )
}
