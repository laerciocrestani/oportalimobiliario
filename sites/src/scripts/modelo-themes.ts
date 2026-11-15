const SAMPLE_RATE = 0.0099

function digits(value: string | undefined): number {
  const raw = (value ?? '').replace(/\D/g, '')

  return raw ? Number(raw) : 0
}

function money(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function installment(valor: number, entradaPct: number, months: number): number | null {
  if (valor <= 0 || months < 1) {
    return null
  }

  const percent = Math.min(80, Math.max(0, entradaPct))
  const principal = valor * (1 - percent / 100)

  if (principal <= 0) {
    return 0
  }

  const growth = (1 + SAMPLE_RATE) ** months

  return (principal * SAMPLE_RATE * growth) / (growth - 1)
}

function bindFinance(form: HTMLFormElement): void {
  const output = form.querySelector<HTMLElement>('[data-finance-out]')

  if (!output) {
    return
  }

  const update = () => {
    const valor = digits(form.querySelector<HTMLInputElement>('[name="valor"]')?.value)
    const entrada = digits(form.querySelector<HTMLInputElement>('[name="entrada"]')?.value)
    const prazo = digits(form.querySelector<HTMLInputElement>('[name="prazo"]')?.value)
    const parcela = installment(valor, entrada, prazo)

    if (parcela == null) {
      output.textContent = 'Informe o valor do imóvel.'
      return
    }

    if (parcela === 0) {
      output.textContent = 'A entrada cobre o valor informado.'
      return
    }

    output.textContent = `${money(parcela)} / mês`
  }

  form.addEventListener('input', update)
  update()
}

function bindLead(form: HTMLFormElement): void {
  const note = form.querySelector<HTMLElement>('[data-lead-note]')
  const next = form.querySelector<HTMLAnchorElement>('[data-lead-next]')

  form.addEventListener('submit', (event) => {
    event.preventDefault()

    const perfil = new FormData(form).get('perfil')
    const href = perfil === 'construtora' ? form.dataset.builder : form.dataset.broker

    if (next && href) {
      next.href = href
      next.hidden = false
    }

    if (note) {
      note.hidden = false
    }
  })
}

function animateCount(node: HTMLElement): void {
  const target = Number(node.dataset.count ?? '0')

  if (!Number.isFinite(target)) {
    return
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduce) {
    node.textContent = target.toLocaleString('pt-BR')
    return
  }

  const start = performance.now()
  const duration = 700

  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / duration)
    const value = Math.round(target * (1 - (1 - progress) ** 3))
    node.textContent = value.toLocaleString('pt-BR')

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

export function initModeloThemes(): void {
  document.querySelectorAll<HTMLFormElement>('[data-finance]').forEach(bindFinance)
  document.querySelectorAll<HTMLFormElement>('[data-lead]').forEach(bindLead)

  const counts = [...document.querySelectorAll<HTMLElement>('[data-count]')]

  if (counts.length === 0 || !('IntersectionObserver' in window)) {
    counts.forEach(animateCount)
    return
  }

  const seen = new WeakSet<HTMLElement>()
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || !(entry.target instanceof HTMLElement) || seen.has(entry.target)) {
        continue
      }

      seen.add(entry.target)
      animateCount(entry.target)
      observer.unobserve(entry.target)
    }
  }, { threshold: 0.4 })

  counts.forEach((node) => observer.observe(node))
}
