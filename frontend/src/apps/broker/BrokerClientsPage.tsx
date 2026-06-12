import { useEffect, useState } from 'react'
import { BrokerDashboardShell } from '@/apps/broker/components/BrokerDashboardShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { brokerApi, type BrokerClient } from '@/lib/api'

export function BrokerClientsPage() {
  const [clients, setClients] = useState<BrokerClient[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setError(null)
      setClients(await brokerApi.listClients())
    } catch {
      setError('Não foi possível carregar os clientes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await brokerApi.createClient({
      name,
      phone,
      email: email || undefined,
    })
    setName('')
    setPhone('')
    setEmail('')
    await load()
  }

  return (
    <BrokerDashboardShell title="Clientes">
      <div className="space-y-8">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Novo cliente</CardTitle>
            <CardDescription>Cadastre clientes vinculados ao seu perfil de corretor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Telefone *</Label>
                <Input
                  id="client-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="client-email">E-mail</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Cadastrar cliente</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h3 className="text-lg font-medium">Clientes cadastrados</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {clients.map((client) => (
                <li key={client.id} className="px-4 py-3">
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ''}
                  </p>
                </li>
              ))}
              {clients.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum cliente cadastrado ainda.
                </li>
              ) : null}
            </ul>
          )}
        </section>
      </div>
    </BrokerDashboardShell>
  )
}
