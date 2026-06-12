import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const kpiCards = [
  { label: 'Empreendimentos', value: '3' },
  { label: 'Unidades liberadas', value: '48' },
  { label: 'Reservas ativas', value: '12' },
  { label: 'Reservas canceladas', value: '2' },
]

const unitsByStatus = [
  { status: 'available', count: 28, fill: 'var(--color-available)' },
  { status: 'reserved', count: 12, fill: 'var(--color-reserved)' },
  { status: 'sold', count: 6, fill: 'var(--color-sold)' },
  { status: 'unavailable', count: 2, fill: 'var(--color-unavailable)' },
]

const buildingsChart = [
  { name: 'Aurora', units: 18 },
  { name: 'Horizonte', units: 16 },
  { name: 'Vista Verde', units: 14 },
]

const statusChartConfig = {
  available: { label: 'Disponível', color: 'hsl(142 71% 45%)' },
  reserved: { label: 'Reservado', color: 'hsl(24 95% 53%)' },
  sold: { label: 'Vendido', color: 'hsl(215 16% 47%)' },
  unavailable: { label: 'Indisponível', color: 'hsl(0 84% 60%)' },
} satisfies ChartConfig

const buildingsChartConfig = {
  units: { label: 'Unidades', color: 'hsl(221 83% 53%)' },
} satisfies ChartConfig

export function BrokerOverviewPage() {
  return (
    <BrokerDashboardShell title="Visão geral">
      <div className="space-y-8">
        <p className="text-sm text-muted-foreground">Dados ilustrativos para demonstração.</p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((item) => (
            <Card key={item.label}>
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Unidades por status</CardTitle>
              <CardDescription>Distribuição das unidades liberadas</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={unitsByStatus} dataKey="count" nameKey="status" innerRadius={60}>
                    {unitsByStatus.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unidades por empreendimento</CardTitle>
              <CardDescription>Volume de unidades por cartão</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={buildingsChartConfig} className="aspect-auto h-[280px] w-full">
                <BarChart data={buildingsChart}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="units" fill="var(--color-units)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </BrokerDashboardShell>
  )
}
