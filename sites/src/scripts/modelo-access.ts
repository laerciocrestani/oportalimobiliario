import { clearSharedToken, readSharedToken, writeSharedToken } from '@/lib/auth-token'

const BROKER_ORIGIN = 'http://corretor.localhost:5173'

type SessionUser = {
  name: string
  role: string
}

export function initModeloAccess(dialog: HTMLDialogElement | null): void {
  if (!dialog || dialog.dataset.accessReady === 'true') {
    return
  }

  dialog.dataset.accessReady = 'true'

  const session = dialog.querySelector<HTMLElement>('[data-access-session]')
  const who = dialog.querySelector<HTMLElement>('[data-access-who]')
  const auth = dialog.querySelector<HTMLElement>('[data-access-auth]')
  const loginForm = dialog.querySelector<HTMLFormElement>('[data-access-login]')
  const registerForm = dialog.querySelector<HTMLFormElement>('[data-access-register]')
  const errorNode = dialog.querySelector<HTMLElement>('[data-access-error]')
  const successNode = dialog.querySelector<HTMLElement>('[data-access-success]')
  const send = dialog.querySelector<HTMLButtonElement>('[data-access-send]')
  const loginUrl = dialog.dataset.loginUrl ?? ''
  const registerUrl = dialog.dataset.registerUrl ?? ''
  const requestUrl = dialog.dataset.requestUrl ?? ''
  const meUrl = dialog.dataset.meUrl ?? ''

  function showError(message: string): void {
    if (!errorNode) {
      return
    }

    errorNode.textContent = message
    errorNode.removeAttribute('hidden')
    errorNode.focus()
  }

  function clearError(): void {
    if (!errorNode) {
      return
    }

    errorNode.textContent = ''
    errorNode.setAttribute('hidden', '')
  }

  function showSuccess(message: string, options?: { dashboard?: boolean }): void {
    clearError()
    session?.setAttribute('hidden', '')
    auth?.setAttribute('hidden', '')
    if (!successNode) {
      return
    }

    successNode.textContent = message
    successNode.removeAttribute('hidden')
    successNode.focus()

    if (options?.dashboard === false) {
      dialog.querySelector<HTMLAnchorElement>('[data-access-dashboard]')?.setAttribute('hidden', '')
      return
    }

    void armDashboard()
  }

  async function armDashboard(): Promise<void> {
    const token = readSharedToken()
    const link = dialog.querySelector<HTMLAnchorElement>('[data-access-dashboard]')
    const handoffUrl = dialog.dataset.handoffUrl

    if (!token || !link) {
      return
    }

    if (handoffUrl) {
      const response = await fetch(handoffUrl, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const body = (await response.json()) as { code?: string }

        if (body.code) {
          link.href = `${BROKER_ORIGIN}/session-bridge?code=${encodeURIComponent(body.code)}`
        }
      }
    }

    link.removeAttribute('hidden')
  }

  function showSession(name: string): void {
    auth?.setAttribute('hidden', '')
    session?.removeAttribute('hidden')
    if (who) {
      who.textContent = `Pedido como ${name}.`
    }
  }

  function showAuth(): void {
    session?.setAttribute('hidden', '')
    auth?.removeAttribute('hidden')
  }

  async function errorMessage(response: Response, fallback: string): Promise<string> {
    if (response.status >= 500) {
      return fallback
    }
    try {
      const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> }
      const first = body.errors ? Object.values(body.errors).flat().find((item) => item !== '') : ''

      return first || body.message || fallback
    } catch {
      return fallback
    }
  }

  async function sendRequest(token: string): Promise<void> {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      showError(await errorMessage(response, 'Não foi possível enviar o pedido.'))
      return
    }

    const body = (await response.json()) as { message?: string }
    showSuccess(body.message ?? 'Pedido enviado para a construtora.')
  }

  let bridgeReady = false

  function publishToken(token: string | null): void {
    const frame = document.querySelector<HTMLIFrameElement>('[data-session-bridge]')

    if (!frame?.contentWindow || !bridgeReady) {
      return
    }

    frame.contentWindow.postMessage({ type: 'opim-token', token }, BROKER_ORIGIN)
  }

  async function refresh(): Promise<void> {
    const token = readSharedToken()

    if (!token) {
      showAuth()
      return
    }

    const response = await fetch(meUrl, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      clearSharedToken()
      showAuth()
      return
    }

    const user = (await response.json()) as SessionUser

    if (user.role !== 'broker') {
      showAuth()
      showError('Esta entrada é para corretores.')
      return
    }

    clearError()
    showSession(user.name)
  }

  dialog.querySelectorAll<HTMLButtonElement>('[data-access-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.accessMode
      const login = mode !== 'register'
      loginForm?.toggleAttribute('hidden', !login)
      registerForm?.toggleAttribute('hidden', login)
      dialog.querySelectorAll<HTMLButtonElement>('[data-access-mode]').forEach((item) => {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false')
      })
      clearError()
    })
  })

  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    clearError()
    const data = new FormData(loginForm)
    const submit = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]')

    if (submit) {
      submit.disabled = true
    }

    fetch(loginUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(data.get('email') ?? ''),
        password: String(data.get('password') ?? ''),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          showError(await errorMessage(response, 'Não foi possível entrar.'))
          return
        }

        const body = (await response.json()) as { token?: string; user?: SessionUser }

        if (!body.token || body.user?.role !== 'broker') {
          showError('Esta entrada é para corretores.')
          return
        }

        writeSharedToken(body.token)
        await sendRequest(body.token)
        publishToken(body.token)
      })
      .catch(() => showError('Não foi possível entrar.'))
      .finally(() => {
        if (submit) {
          submit.disabled = false
        }
      })
  })

  registerForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    clearError()
    const data = new FormData(registerForm)
    const password = String(data.get('password') ?? '')
    const confirmation = String(data.get('password_confirmation') ?? '')

    if (password !== confirmation) {
      showError('As senhas não coincidem.')
      return
    }

    const submit = registerForm.querySelector<HTMLButtonElement>('button[type="submit"]')

    if (submit) {
      submit.disabled = true
    }

    fetch(registerUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(data.get('name') ?? ''),
        phone: String(data.get('phone') ?? ''),
        email: String(data.get('email') ?? ''),
        password,
        password_confirmation: confirmation,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          showError(await errorMessage(response, 'Não foi possível criar a conta.'))
          return
        }

        const body = (await response.json()) as {
          token?: string
          message?: string
          email_confirmation_required?: boolean
        }

        if (body.email_confirmation_required) {
          showSuccess(body.message ?? 'Confirme em seu e-mail.', { dashboard: false })
          return
        }

        if (body.token) {
          writeSharedToken(body.token)
          publishToken(body.token)
        }

        showSuccess(body.message ?? 'Pedido enviado para a construtora.')
      })
      .catch(() => showError('Não foi possível criar a conta.'))
      .finally(() => {
        if (submit) {
          submit.disabled = false
        }
      })
  })

  send?.addEventListener('click', () => {
    const token = readSharedToken()

    if (!token) {
      showAuth()
      return
    }

    send.disabled = true
    sendRequest(token).finally(() => {
      send.disabled = false
    })
  })

  let attempts = 0
  const ping = window.setInterval(() => {
    attempts += 1

    if (bridgeReady || attempts > 20) {
      window.clearInterval(ping)
      return
    }

    document.querySelector<HTMLIFrameElement>('[data-session-bridge]')?.contentWindow?.postMessage(
      { type: 'opim-bridge-ping' },
      BROKER_ORIGIN,
    )
  }, 300)

  window.addEventListener('message', (event) => {
    if (event.origin !== BROKER_ORIGIN) {
      return
    }

    if (event.data?.type === 'opim-bridge-ready') {
      bridgeReady = true
      const token = readSharedToken()

      if (token) {
        publishToken(token)
      }

      return
    }

    if (event.data?.type !== 'opim-token') {
      return
    }

    if (typeof event.data.token === 'string' && event.data.token !== '') {
      writeSharedToken(event.data.token)
    } else {
      clearSharedToken()
    }

    void refresh()
  })

  document.querySelectorAll<HTMLButtonElement>('[data-contact-open]').forEach((button) => {
    button.addEventListener('click', () => {
      void refresh()
    })
  })
}
