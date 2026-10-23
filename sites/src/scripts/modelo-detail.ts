import {
  LIST_STORAGE_KEY,
  compareUnitValues,
  detailHref,
  nextOrdem,
  parseDetailQuery,
  toDetailSearch,
  unitCounter,
  unitMatches,
  type DetailQuery,
  type UnitSortRecord,
} from '@/lib/modelo'

const FIELDS: Array<[string, string]> = [
  ['code', 'Código'],
  ['floor', 'Andar'],
  ['area', 'Área privativa'],
  ['bedrooms', 'Dormitórios'],
  ['suites', 'Suítes'],
  ['bathrooms', 'Banheiros'],
  ['amenities', 'Diferenciais'],
  ['price', 'Preço'],
  ['status', 'Status'],
]

export function initModeloDetail(): void {
  document.querySelector<HTMLButtonElement>('[data-retry]')?.addEventListener('click', () => {
    location.reload()
  })

  restoreListLink()

  const article = document.querySelector<HTMLElement>('[data-modelo-building]')

  if (!article || article.dataset.ready === 'true') {
    return
  }

  article.dataset.ready = 'true'

  const codeInput = article.querySelector<HTMLInputElement>('[name="codigo"]')
  const floorFrom = article.querySelector<HTMLInputElement>('[name="andar-de"]')
  const floorTo = article.querySelector<HTMLInputElement>('[name="andar-ate"]')
  const priceInput = article.querySelector<HTMLInputElement>('[name="ate"]')
  const form = article.querySelector<HTMLFormElement>('#modelo-unidades')
  const table = article.querySelector<HTMLTableElement>('[data-unit-table]')
  const count = article.querySelector<HTMLElement>('[data-unit-count]')
  const empty = article.querySelector<HTMLElement>('[data-unit-empty]')
  const bar = document.querySelector<HTMLElement>('[data-compare-bar]')
  const picks = document.querySelector<HTMLElement>('[data-compare-picks]')
  const openCompare = document.querySelector<HTMLButtonElement>('[data-compare-open]')
  const limit = document.querySelector<HTMLElement>('[data-compare-limit]')
  const compareDialog = document.querySelector<HTMLDialogElement>('[data-compare-dialog]')
  const compareMount = document.querySelector<HTMLElement>('[data-compare-mount]')
  const lightbox = document.querySelector<HTMLDialogElement>('[data-lightbox]')
  const contact = document.querySelector<HTMLDialogElement>('[data-contact]')
  let opener: HTMLElement | null = null
  let historyBurst = false
  let historyTimer = 0

  const initial = parseDetailQuery(new URLSearchParams(location.search))
  let selected = initial.comparar.filter((code) => rowByCode(code) !== undefined)
  let expanded = expandable(initial.unidade) ? initial.unidade : ''

  bindDialog(compareDialog)
  bindDialog(lightbox)
  bindDialog(contact)
  bindAccessForm(contact)
  watchSections()
  syncExpand()
  syncCompare()

  article.querySelector<HTMLButtonElement>('[data-lightbox-open]')?.addEventListener('click', (event) => {
    if (lightbox && event.currentTarget instanceof HTMLElement) {
      show(lightbox, event.currentTarget)
    }
  })

  article.querySelectorAll<HTMLButtonElement>('[data-contact-open]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!contact) {
        return
      }

      show(contact, button)
    })
  })

  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    publish('discrete')
  })

  for (const input of [codeInput, floorFrom, floorTo, priceInput]) {
    input?.addEventListener('input', () => publish('typing'))
  }

  article.querySelectorAll<HTMLAnchorElement>('[data-filter]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const group = link.dataset.filter
      const value = link.dataset.value ?? ''
      const pressed = link.getAttribute('aria-pressed') === 'true'

      article.querySelectorAll<HTMLAnchorElement>(`[data-filter="${group}"]`).forEach((item) => {
        item.setAttribute('aria-pressed', 'false')
      })

      if (!pressed) {
        link.setAttribute('aria-pressed', 'true')
        link.dataset.value = value
      }

      publish('discrete')
    })
  })

  article.querySelectorAll<HTMLAnchorElement>('[data-sort-key]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!table) {
        return
      }

      event.preventDefault()
      const key = link.dataset.sortKey

      if (!key) {
        return
      }

      const current = table.dataset.sort ?? ''
      table.dataset.sort = current === `${key}-asc` ? `${key}-desc` : `${key}-asc`
      publish('discrete')
    })
  })

  article.querySelectorAll<HTMLButtonElement>('[data-expand-button]').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.getAttribute('data-expand-button') ?? ''
      expanded = expanded === code ? '' : code
      syncExpand()
      publish('discrete')
    })
  })

  article.querySelectorAll<HTMLButtonElement>('[data-compare]').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.getAttribute('data-compare') ?? ''

      if (!code) {
        return
      }

      if (selected.includes(code)) {
        selected = selected.filter((item) => item !== code)

        if (limit) {
          limit.hidden = true
        }
      } else if (selected.length >= 3) {
        if (limit) {
          limit.hidden = false
        }

        return
      } else {
        selected = [...selected, code]

        if (limit) {
          limit.hidden = true
        }
      }

      syncCompare()
      publish('discrete')
    })
  })

  empty?.querySelector('a')?.addEventListener('click', (event) => {
    event.preventDefault()

    if (codeInput) {
      codeInput.value = ''
    }

    if (floorFrom) {
      floorFrom.value = ''
    }

    if (floorTo) {
      floorTo.value = ''
    }

    if (priceInput) {
      priceInput.value = ''
    }

    article.querySelectorAll<HTMLAnchorElement>('[data-filter]').forEach((link) => {
      link.setAttribute('aria-pressed', 'false')
    })
    publish('discrete')
  })

  openCompare?.addEventListener('click', () => {
    if (!compareDialog || selected.length < 2) {
      return
    }

    buildCompare()
    show(compareDialog, openCompare)
  })

  window.addEventListener('popstate', () => {
    const query = parseDetailQuery(new URLSearchParams(location.search))

    if (codeInput) {
      codeInput.value = query.codigo
    }

    if (floorFrom) {
      floorFrom.value = query.andarDe == null ? '' : String(query.andarDe)
    }

    if (floorTo) {
      floorTo.value = query.andarAte == null ? '' : String(query.andarAte)
    }

    if (priceInput) {
      priceInput.value = query.ate == null ? '' : String(query.ate)
    }

    if (table) {
      table.dataset.sort = query.ordem ?? ''
    }

    article.querySelectorAll<HTMLAnchorElement>('[data-filter="dorms"]').forEach((link) => {
      link.setAttribute('aria-pressed', link.dataset.value === String(query.dorms ?? '') ? 'true' : 'false')
    })
    article.querySelectorAll<HTMLAnchorElement>('[data-filter="diferencial"]').forEach((link) => {
      link.setAttribute('aria-pressed', (link.dataset.value ?? '') === query.diferencial ? 'true' : 'false')
    })
    selected = query.comparar.filter((code) => rowByCode(code) !== undefined)
    expanded = expandable(query.unidade) ? query.unidade : ''
    syncExpand()
    syncCompare()
    render()
  })

  render()

  function render(): DetailQuery {
    const query = readState()
    const tbody = table?.tBodies[0]

    if (table && tbody && count) {
      const rows = [...tbody.querySelectorAll<HTMLTableRowElement>('[data-unit]')]

      rows.sort((a, b) => compareUnitValues(sortRecord(a), sortRecord(b), query.ordem))

      let shown = 0

      for (const row of rows) {
        const match = unitMatches(readUnit(row), query)
        row.hidden = !match
        tbody.append(row)

        if (match) {
          shown += 1
        }
      }

      count.textContent = unitCounter(shown, rows.length)

      if (empty) {
        empty.hidden = shown !== 0
      }

      const wrap = table.closest<HTMLElement>('.modelo-table-wrap')

      if (wrap) {
        wrap.hidden = shown === 0
      }

      table.dataset.sort = query.ordem ?? ''
      table.querySelectorAll<HTMLTableCellElement>('th').forEach((cell) => {
        const link = cell.querySelector<HTMLAnchorElement>('[data-sort-key]')

        if (!link) {
          return
        }

        const key = link.dataset.sortKey ?? ''

        if (query.ordem === `${key}-asc`) {
          cell.setAttribute('aria-sort', 'ascending')
        } else if (query.ordem === `${key}-desc`) {
          cell.setAttribute('aria-sort', 'descending')
        } else {
          cell.setAttribute('aria-sort', 'none')
        }
      })

      refreshHrefs(query)
    }

    return query
  }

  function publish(mode: 'discrete' | 'typing' | 'none'): void {
    const query = render()

    if (mode === 'none') {
      return
    }

    const next = `${location.pathname}${toDetailSearch(query)}`
    const current = `${location.pathname}${location.search}`

    if (next === current) {
      return
    }

    if (mode === 'discrete') {
      history.pushState(null, '', next)
      historyBurst = false
      return
    }

    if (!historyBurst) {
      history.pushState(null, '', next)
      historyBurst = true
    } else {
      history.replaceState(null, '', next)
    }

    window.clearTimeout(historyTimer)
    historyTimer = window.setTimeout(() => {
      historyBurst = false
    }, 400)
  }

  function readState(): DetailQuery {
    const params = new URLSearchParams()
    const codigo = codeInput?.value.trim() ?? ''
    const dorms = pressed('dorms')
    const diferencial = pressed('diferencial')
    const andarDe = floorFrom?.value.trim() ?? ''
    const andarAte = floorTo?.value.trim() ?? ''
    const ate = priceInput?.value.trim() ?? ''
    const ordem = table?.dataset.sort ?? ''

    if (codigo) {
      params.set('codigo', codigo)
    }

    if (dorms) {
      params.set('dorms', dorms)
    }

    if (andarDe) {
      params.set('andar-de', andarDe)
    }

    if (andarAte) {
      params.set('andar-ate', andarAte)
    }

    if (ate) {
      params.set('ate', ate)
    }

    if (diferencial) {
      params.set('diferencial', diferencial)
    }

    if (ordem) {
      params.set('ordem', ordem)
    }

    if (expanded) {
      params.set('unidade', expanded)
    }

    if (selected.length > 0) {
      params.set('comparar', selected.join(','))
    }

    return parseDetailQuery(params)
  }

  function refreshHrefs(query: DetailQuery): void {
    const path = location.pathname

    article?.querySelectorAll<HTMLAnchorElement>('[data-filter="dorms"]').forEach((link) => {
      const value = Number(link.dataset.value)
      link.href = detailHref(path, query, { dorms: query.dorms === value ? null : value })
    })
    article?.querySelectorAll<HTMLAnchorElement>('[data-filter="diferencial"]').forEach((link) => {
      const value = link.dataset.value ?? ''
      link.href = detailHref(path, query, { diferencial: query.diferencial === value ? '' : value })
    })
    article?.querySelectorAll<HTMLAnchorElement>('[data-sort-key]').forEach((link) => {
      const key = link.dataset.sortKey

      if (key === 'codigo' || key === 'andar' || key === 'area' || key === 'preco') {
        link.href = detailHref(path, query, { ordem: nextOrdem(query.ordem, key) })
      }
    })

    const clear = empty?.querySelector('a')

    if (clear) {
      clear.href = detailHref(path, query, {
        codigo: '',
        dorms: null,
        andarDe: null,
        andarAte: null,
        ate: null,
        diferencial: '',
      })
    }
  }

  function syncExpand(): void {
    article?.querySelectorAll<HTMLElement>('[data-expand-for]').forEach((panel) => {
      const open = panel.getAttribute('data-expand-for') === expanded
      panel.classList.toggle('is-open', open)

      if (open) {
        panel.removeAttribute('inert')
      } else {
        panel.setAttribute('inert', '')
      }
    })
    article?.querySelectorAll<HTMLButtonElement>('[data-expand-button]').forEach((button) => {
      const open = button.getAttribute('data-expand-button') === expanded
      button.setAttribute('aria-expanded', open ? 'true' : 'false')
      button.textContent = open ? 'Ocultar diferenciais' : 'Ver diferenciais'
    })
  }

  function syncCompare(): void {
    article?.querySelectorAll<HTMLButtonElement>('[data-compare]').forEach((button) => {
      const code = button.getAttribute('data-compare') ?? ''
      const on = selected.includes(code)
      button.setAttribute('aria-pressed', on ? 'true' : 'false')
      button.textContent = on ? 'Na comparação' : 'Comparar'
    })

    if (!bar || !picks || !openCompare) {
      return
    }

    bar.hidden = selected.length === 0
    openCompare.hidden = selected.length < 2
    document.body.classList.toggle('modelo-has-compare', selected.length > 0)
    picks.replaceChildren()

    for (const code of selected) {
      const item = document.createElement('li')
      const name = document.createElement('span')
      const remove = document.createElement('button')

      name.textContent = code
      remove.type = 'button'
      remove.className = 'modelo-button modelo-button--quiet'
      remove.textContent = 'Remover'
      remove.setAttribute('aria-label', `Remover unidade ${code} da comparação`)
      remove.addEventListener('click', () => {
        selected = selected.filter((itemCode) => itemCode !== code)
        syncCompare()
        publish('discrete')

        if (selected.length < 2) {
          compareDialog?.close()
        } else if (compareDialog?.open) {
          buildCompare()
        }
      })
      item.append(name, remove)
      picks.append(item)
    }
  }

  function buildCompare(): void {
    if (!compareMount) {
      return
    }

    const rows = selected.flatMap((code) => {
      const row = rowByCode(code)

      return row ? [row] : []
    })
    const tableEl = document.createElement('table')
    const caption = document.createElement('caption')
    const head = document.createElement('thead')
    const body = document.createElement('tbody')
    const headRow = document.createElement('tr')
    const corner = document.createElement('th')

    tableEl.className = 'modelo-compare'
    caption.className = 'modelo-sr'
    caption.textContent = 'Comparação das unidades selecionadas'
    corner.scope = 'col'
    corner.textContent = 'Atributo'
    headRow.append(corner)

    for (const row of rows) {
      const cell = document.createElement('th')
      cell.scope = 'col'
      cell.textContent = row.dataset.code ?? ''
      headRow.append(cell)
    }

    head.append(headRow)

    for (const [field, label] of FIELDS) {
      const values = rows.map((row) => fieldValue(row, field))

      if (values.every((value) => value.text === '')) {
        continue
      }

      const tr = document.createElement('tr')
      const title = document.createElement('th')

      title.scope = 'row'
      title.textContent = label
      tr.append(title)

      if (new Set(values.map((value) => value.text)).size > 1) {
        tr.classList.add('is-diff')
      }

      for (const value of values) {
        const cell = document.createElement('td')
        cell.textContent = value.text

        if (value.muted) {
          cell.classList.add('is-muted')
        }

        tr.append(cell)
      }

      body.append(tr)
    }

    tableEl.append(caption, head, body)
    compareMount.replaceChildren(tableEl)
  }

  function show(dialog: HTMLDialogElement, source: HTMLElement): void {
    opener = source
    dialog.showModal()
  }

  function bindDialog(dialog: HTMLDialogElement | null): void {
    if (!dialog) {
      return
    }

    dialog.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => {
      button.addEventListener('click', () => dialog.close())
    })
    dialog.addEventListener('close', () => {
      opener?.focus()
      opener = null
    })
  }

  function bindAccessForm(dialog: HTMLDialogElement | null): void {
    const form = dialog?.querySelector<HTMLFormElement>('[data-access-form]')

    if (!form) {
      return
    }

    const errorNode = form.querySelector<HTMLElement>('[data-access-error]')
    const successNode = form.querySelector<HTMLElement>('[data-access-success]')
    const fields = form.querySelector<HTMLElement>('[data-access-fields]')
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    const submitLabel = submit?.textContent ?? 'Enviar pedido'

    form.addEventListener('submit', (event) => {
      event.preventDefault()

      if (!submit || submit.disabled) {
        return
      }

      const showError = (message: string): void => {
        if (!errorNode) {
          return
        }

        errorNode.textContent = message
        errorNode.removeAttribute('hidden')
        errorNode.focus()
      }

      if (errorNode) {
        errorNode.textContent = ''
        errorNode.setAttribute('hidden', '')
      }

      submit.disabled = true
      submit.textContent = 'Enviando…'

      const data = new FormData(form)
      const payload = {
        name: String(data.get('name') ?? ''),
        phone: String(data.get('phone') ?? ''),
        email: String(data.get('email') ?? ''),
      }

      fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          if (response.ok) {
            fields?.setAttribute('hidden', '')
            successNode?.removeAttribute('hidden')
            successNode?.focus()
            return
          }

          submit.disabled = false
          submit.textContent = submitLabel

          if (response.status === 429) {
            showError('Muitas tentativas. Espere um instante e tente de novo.')
            return
          }

          if (response.status === 422) {
            const body = (await response.json().catch(() => null)) as {
              errors?: Record<string, string[]>
            } | null
            const message = body?.errors ? Object.values(body.errors).flat().find((item) => item !== '') : ''
            showError(message || 'Confira os dados e tente de novo.')
            return
          }

          showError('Não foi possível enviar o pedido. Tente de novo.')
        })
        .catch(() => {
          submit.disabled = false
          submit.textContent = submitLabel
          showError('Não foi possível enviar o pedido. Tente de novo.')
        })
    })
  }

  function watchSections(): void {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-modelo-toc] a')]
    const sections = links
      .map((link) => document.querySelector<HTMLElement>(link.getAttribute('href') ?? ''))
      .filter((section): section is HTMLElement => section !== null)

    if (sections.length === 0 || !('IntersectionObserver' in window)) {
      return
    }

    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }

        const current = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

        if (!current || (visible.get(current) ?? 0) <= 0) {
          return
        }

        for (const link of links) {
          if (link.getAttribute('href') === `#${current}`) {
            link.setAttribute('aria-current', 'location')
          } else {
            link.removeAttribute('aria-current')
          }
        }
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.6] },
    )

    for (const section of sections) {
      observer.observe(section)
    }
  }
}

function restoreListLink(): void {
  let referrer: URL | null = null

  try {
    if (document.referrer) {
      referrer = new URL(document.referrer)
    }
  } catch {
    referrer = null
  }

  if (!referrer || referrer.origin !== location.origin || referrer.pathname !== '/modelo') {
    return
  }

  const search = referrer.search || sessionStorage.getItem(LIST_STORAGE_KEY) || ''

  if (!search.startsWith('?')) {
    return
  }

  document.querySelectorAll<HTMLAnchorElement>('[data-modelo-back]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? ''

    if (href === '/modelo' || href === '/modelo#lancamentos') {
      anchor.setAttribute('href', `/modelo${search}#lancamentos`)
    }
  })
}

function rowByCode(code: string): HTMLTableRowElement | undefined {
  return [...document.querySelectorAll<HTMLTableRowElement>('[data-unit]')].find((row) => row.dataset.code === code)
}

function expandable(code: string): boolean {
  if (!code) {
    return false
  }

  return [...document.querySelectorAll('[data-expand-button]')].some(
    (button) => button.getAttribute('data-expand-button') === code,
  )
}

function pressed(group: string): string {
  const link = [...document.querySelectorAll<HTMLAnchorElement>(`[data-filter="${group}"]`)].find(
    (item) => item.getAttribute('aria-pressed') === 'true',
  )

  return link?.dataset.value ?? ''
}

function readUnit(row: HTMLTableRowElement): {
  code: string
  floor: number | null
  bedrooms: number | null
  price: number | null
  amenities: string[]
} {
  return {
    code: row.dataset.code ?? '',
    floor: optionalNumber(row.dataset.floor),
    bedrooms: optionalNumber(row.dataset.bedrooms),
    price: optionalNumber(row.dataset.price),
    amenities: parseAmenities(row.dataset.amenities),
  }
}

function sortRecord(row: HTMLTableRowElement): UnitSortRecord {
  return {
    index: Number(row.dataset.index ?? 0),
    code: row.dataset.code ?? '',
    floor: optionalNumber(row.dataset.floor),
    area: optionalNumber(row.dataset.area),
    price: optionalNumber(row.dataset.price),
  }
}

function optionalNumber(value: string | undefined): number | null {
  if (value == null || value === '') {
    return null
  }

  const number = Number(value)

  return Number.isFinite(number) ? number : null
}

function parseAmenities(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function fieldValue(row: HTMLTableRowElement, field: string): { text: string; muted: boolean } {
  const node = row.querySelector<HTMLElement>(`[data-field="${field}"]`)

  if (!node) {
    return { text: '', muted: false }
  }

  return {
    text: node.dataset.value ?? '',
    muted: node.dataset.muted === 'true',
  }
}
