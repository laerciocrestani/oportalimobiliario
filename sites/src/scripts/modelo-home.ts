import {
  LIST_STORAGE_KEY,
  compareHome,
  formatBrl,
  launchCount,
  matchesCity,
  matchesPrice,
  parseHomeQuery,
  toHomeSearch,
  type HomeQuery,
  type HomeRecord,
} from '@/lib/modelo'

function readCard(card: HTMLElement): HomeRecord {
  const price = card.dataset.price ? Number(card.dataset.price) : Number.NaN

  return {
    index: Number(card.dataset.index ?? 0),
    name: card.dataset.name ?? '',
    city: card.dataset.city || null,
    price: Number.isFinite(price) ? price : null,
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function initModeloHome(): void {
  document.querySelector<HTMLButtonElement>('[data-retry]')?.addEventListener('click', () => {
    location.reload()
  })

  const root = document.querySelector<HTMLElement>('[data-modelo-home]')

  if (!root || root.dataset.ready === 'true') {
    return
  }

  root.dataset.ready = 'true'

  const form = document.querySelector<HTMLFormElement>('#modelo-busca')
  const cityInput = document.querySelector<HTMLInputElement>('#cidade')
  const priceInput = document.querySelector<HTMLInputElement>('input[name="ate"]')
  const sortSelect = document.querySelector<HTMLSelectElement>('[data-modelo-sort]')
  const grid = document.querySelector<HTMLElement>('[data-modelo-grid]')
  const count = document.querySelector<HTMLElement>('[data-modelo-count]')
  const empty = document.querySelector<HTMLElement>('[data-modelo-empty]')
  const chips = document.querySelector<HTMLElement>('[data-modelo-chips]')
  const list = document.querySelector<HTMLElement>('#lancamentos')
  const suggestions = document.querySelector<HTMLElement>('#cidade-sugestoes')
  const cities = readCities()

  if (!form || !grid || !count || !empty || !chips || !sortSelect) {
    return
  }

  const searchForm: HTMLFormElement = form
  const cardGrid: HTMLElement = grid
  const countNode: HTMLElement = count
  const emptyNode: HTMLElement = empty
  const chipList: HTMLElement = chips
  const sortControl: HTMLSelectElement = sortSelect
  let activeSuggestion = -1

  function currentQuery(): HomeQuery {
    const params = new URLSearchParams()
    const cidade = cityInput?.value.trim() ?? ''
    const ate = priceInput?.value.trim() ?? ''

    if (cidade) {
      params.set('cidade', cidade)
    }

    if (ate) {
      params.set('ate', ate)
    }

    if (sortControl.value) {
      params.set('ordem', sortControl.value)
    }

    return parseHomeQuery(params)
  }

  function renderChips(query: HomeQuery): void {
    chipList.replaceChildren()

    if (query.cidade) {
      chipList.append(chip(query.cidade, `Remover filtro de cidade ${query.cidade}`, () => {
        if (cityInput) {
          cityInput.value = ''
        }

        apply({ history: 'push' })
      }))
    }

    if (query.ate != null) {
      chipList.append(
        chip(`Preço até ${formatBrl(query.ate)}`, 'Remover filtro de preço', () => {
          if (priceInput) {
            priceInput.value = ''
          }

          apply({ history: 'push' })
        }),
      )
    }
  }

  function apply(options: { history: 'push' | 'none'; scroll?: boolean }): void {
    const query = currentQuery()
    const cards = [...cardGrid.querySelectorAll<HTMLElement>('[data-card]')]
    const items = cards.map((card) => ({ card, record: readCard(card) }))

    items.sort((a, b) => compareHome(a.record, b.record, query.ordem))

    let visible = 0

    for (const item of items) {
      const show =
        matchesCity(item.record.city, query.cidade) && matchesPrice(item.record.price, query.ate)

      item.card.hidden = !show
      cardGrid.append(item.card)

      if (show) {
        visible += 1
      }
    }

    countNode.textContent = launchCount(visible)
    emptyNode.hidden = visible !== 0
    cardGrid.hidden = visible === 0
    renderChips(query)

    const search = toHomeSearch(query)
    sessionStorage.setItem(LIST_STORAGE_KEY, search)

    if (options.history === 'push') {
      const next = `${location.pathname}${search}`
      const current = `${location.pathname}${location.search}`

      if (next !== current) {
        history.pushState(null, '', next)
      }
    }

    if (options.scroll && list) {
      list.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      list.focus()
    }
  }

  function closeSuggestions(): void {
    if (!suggestions || !cityInput) {
      return
    }

    suggestions.hidden = true
    suggestions.replaceChildren()
    cityInput.setAttribute('aria-expanded', 'false')
    cityInput.removeAttribute('aria-activedescendant')
    activeSuggestion = -1
  }

  function openSuggestions(): void {
    if (!suggestions || !cityInput) {
      return
    }

    const query = cityInput.value.trim().toLocaleLowerCase('pt-BR')
    const matches = cities.filter((city) => {
      if (!query) {
        return true
      }

      return city.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(
        query.normalize('NFD').replace(/\p{Diacritic}/gu, ''),
      )
    })

    suggestions.replaceChildren()
    activeSuggestion = -1

    matches.forEach((city, index) => {
      const item = document.createElement('li')
      const button = document.createElement('button')

      button.type = 'button'
      button.id = `cidade-opcao-${index}`
      button.setAttribute('role', 'option')
      button.textContent = city
      button.addEventListener('mousedown', (event) => {
        event.preventDefault()
      })
      button.addEventListener('click', () => {
        cityInput.value = city
        closeSuggestions()
        cityInput.focus()
      })
      item.append(button)
      suggestions.append(item)
    })

    const hasOptions = matches.length > 0

    suggestions.hidden = !hasOptions
    cityInput.setAttribute('aria-expanded', hasOptions ? 'true' : 'false')
  }

  function moveSuggestion(direction: 1 | -1): void {
    if (!suggestions || !cityInput || suggestions.hidden) {
      return
    }

    const options = [...suggestions.querySelectorAll<HTMLButtonElement>('button')]

    if (options.length === 0) {
      return
    }

    activeSuggestion = (activeSuggestion + direction + options.length) % options.length
    options.forEach((option, index) => {
      option.setAttribute('aria-selected', index === activeSuggestion ? 'true' : 'false')
    })
    const current = options[activeSuggestion]

    if (current) {
      cityInput.setAttribute('aria-activedescendant', current.id)
      current.scrollIntoView({ block: 'nearest' })
    }
  }

  cityInput?.addEventListener('input', openSuggestions)
  cityInput?.addEventListener('focus', openSuggestions)
  cityInput?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveSuggestion(1)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveSuggestion(-1)
    }

    if (event.key === 'Escape') {
      closeSuggestions()
    }

    if (event.key === 'Enter' && activeSuggestion >= 0 && suggestions && !suggestions.hidden) {
      event.preventDefault()
      const option = suggestions.querySelectorAll('button')[activeSuggestion]

      if (option instanceof HTMLButtonElement && cityInput) {
        cityInput.value = option.textContent ?? ''
      }

      closeSuggestions()
      apply({ history: 'push', scroll: true })
    }
  })

  cityInput?.addEventListener('blur', () => {
    window.setTimeout(closeSuggestions, 120)
  })

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault()
    closeSuggestions()
    apply({
      history: 'push',
      scroll: document.activeElement !== sortControl,
    })
  })

  chipList.addEventListener('click', (event) => {
    const link = event.target

    if (!(link instanceof HTMLAnchorElement)) {
      return
    }

    event.preventDefault()
    const label = link.getAttribute('aria-label') ?? ''

    if (label.startsWith('Remover filtro de cidade') && cityInput) {
      cityInput.value = ''
    }

    if (label.startsWith('Remover filtro de preço') && priceInput) {
      priceInput.value = ''
    }

    apply({ history: 'push' })
  })

  emptyNode.querySelector('a')?.addEventListener('click', (event) => {
    event.preventDefault()

    if (cityInput) {
      cityInput.value = ''
    }

    if (priceInput) {
      priceInput.value = ''
    }

    sortControl.value = 'relevancia'
    apply({ history: 'push', scroll: true })
  })

  window.addEventListener('popstate', () => {
    const query = parseHomeQuery(new URLSearchParams(location.search))

    if (cityInput) {
      cityInput.value = query.cidade
    }

    if (priceInput) {
      priceInput.value = query.ate ? String(query.ate) : ''
    }

    sortControl.value = query.ordem
    apply({ history: 'none' })
  })

  if (location.hash === '#lancamentos') {
    list?.focus()
  }

  apply({ history: 'none' })
}

function readCities(): string[] {
  const node = document.querySelector('#modelo-cities')

  if (!node?.textContent) {
    return []
  }

  try {
    const parsed = JSON.parse(node.textContent) as unknown

    return Array.isArray(parsed) ? parsed.filter((city): city is string => typeof city === 'string') : []
  } catch {
    return []
  }
}

function chip(text: string, label: string, onRemove: () => void): HTMLLIElement {
  const item = document.createElement('li')
  const name = document.createElement('span')
  const remove = document.createElement('button')

  item.className = 'modelo-chip'
  name.textContent = text
  remove.type = 'button'
  remove.textContent = 'Remover'
  remove.setAttribute('aria-label', label)
  remove.addEventListener('click', onRemove)
  item.append(name, remove)

  return item
}
