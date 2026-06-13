export function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/30" role="contentinfo">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-3">
          <p className="font-semibold">Dia de Imóveis</p>
          <p className="text-sm text-muted-foreground">
            Plataforma para descobrir lançamentos imobiliários com transparência e curadoria.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Portais</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a href="http://corretor.localhost:5173/login" className="hover:text-foreground">
                Portal do corretor
              </a>
            </li>
            <li>
              <a href="http://construtora.localhost:5173/login" className="hover:text-foreground">
                Portal da construtora
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Contato</p>
          <p className="text-sm text-muted-foreground">
            Dúvidas sobre unidades? Fale com um corretor parceiro pelo portal do corretor.
          </p>
        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {year} Dia de Imóveis. Todos os direitos reservados.
      </div>
    </footer>
  )
}
