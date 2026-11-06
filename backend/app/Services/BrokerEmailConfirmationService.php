<?php

namespace App\Services;

use App\Mail\BrokerEmailConfirmationMail;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class BrokerEmailConfirmationService
{
    public const MESSAGE = 'Confirme em seu e-mail. Enviamos um link para liberar o acesso ao portal do corretor.';

    public function send(User $user): void
    {
        $expiresAt = now()->addHours(48);
        $relativeUrl = URL::temporarySignedRoute(
            'broker.email.confirm',
            $expiresAt,
            ['user' => $user->id],
            absolute: false,
        );

        Mail::to($user->email)->send(new BrokerEmailConfirmationMail(
            name: $user->name,
            confirmUrl: $this->confirmationBaseUrl().$relativeUrl,
            expiresAt: $expiresAt->timezone('America/Sao_Paulo')->format('d/m/Y H:i'),
        ));
    }

    private function confirmationBaseUrl(): string
    {
        $request = request();
        $fromRequest = rtrim($request->getSchemeAndHttpHost(), '/');

        if ($this->urlHasExplicitPort($fromRequest)) {
            return $fromRequest;
        }

        $configured = rtrim((string) config('app.url'), '/');

        if ($this->urlHasExplicitPort($configured)) {
            return $configured;
        }

        $port = (int) $request->getPort();

        if ($port > 0 && ! in_array($port, [80, 443], true)) {
            $base = $fromRequest !== '' ? $fromRequest : $configured;

            return $base.':'.$port;
        }

        return $configured !== '' ? $configured : $fromRequest;
    }

    private function urlHasExplicitPort(string $url): bool
    {
        return is_int(parse_url($url, PHP_URL_PORT));
    }

    public function confirm(Request $request): RedirectResponse
    {
        $loginUrl = rtrim((string) config('opim.frontend_urls.broker'), '/').'/login?confirmation=expired';

        if (! $request->hasValidSignature(false)) {
            return redirect()->away($loginUrl);
        }

        $user = User::query()->find($request->integer('user'));

        if ($user === null || $user->role !== 'broker') {
            return redirect()->away($loginUrl);
        }

        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $code = (string) Str::uuid();
        Cache::put('broker-handoff:'.$code, $user->id, now()->addMinutes(2));

        $brokerUrl = rtrim((string) config('opim.frontend_urls.broker'), '/');

        return redirect()->away($brokerUrl.'/session-bridge?code='.urlencode($code));
    }
}
