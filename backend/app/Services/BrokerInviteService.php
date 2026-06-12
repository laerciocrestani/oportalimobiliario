<?php

namespace App\Services;

use App\Mail\BrokerInviteMail;
use App\Models\BrokerInvite;
use App\Models\BrokerTenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BrokerInviteService
{
    public function inviteUrl(BrokerInvite $invite): string
    {
        $base = rtrim((string) config('opim.frontend_urls.broker'), '/');

        return "{$base}/invite/{$invite->token}";
    }

    public function status(BrokerInvite $invite): string
    {
        if ($invite->accepted_at !== null) {
            return 'accepted';
        }

        if ($invite->expires_at->isPast()) {
            return 'expired';
        }

        return 'pending';
    }

    /**
     * @return array{email: string, tenant_name: string, status: string, expires_at: string|null}
     */
    public function preview(string $token): array
    {
        $invite = $this->findPendingOrAcceptedInvite($token);

        if ($invite === null) {
            throw ValidationException::withMessages([
                'token' => ['Convite inválido ou expirado.'],
            ]);
        }

        $invite->loadMissing('tenant');

        return [
            'email' => $invite->email,
            'tenant_name' => $invite->tenant->name,
            'status' => $this->status($invite),
            'expires_at' => $invite->expires_at->toIso8601String(),
        ];
    }

    /**
     * @return array{token: string, user: array{id: int, name: string, email: string, role: string, tenant_id: int|null}}
     */
    public function accept(string $token, ?string $name = null, ?string $password = null, ?User $authenticatedBroker = null): array
    {
        $invite = BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->with('tenant')
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($invite === null) {
            throw ValidationException::withMessages([
                'token' => ['Convite inválido ou expirado.'],
            ]);
        }

        $broker = $this->resolveBroker($invite, $name, $password, $authenticatedBroker);

        $invite->update([
            'broker_id' => $broker->id,
            'accepted_at' => now(),
        ]);

        BrokerTenant::query()->firstOrCreate(
            [
                'tenant_id' => $invite->tenant_id,
                'broker_id' => $broker->id,
            ],
            [
                'broker_invite_id' => $invite->id,
                'accepted_at' => now(),
            ],
        );

        $apiToken = $broker->createToken('api')->plainTextToken;

        return [
            'token' => $apiToken,
            'user' => [
                'id' => $broker->id,
                'name' => $broker->name,
                'email' => $broker->email,
                'role' => $broker->role,
                'tenant_id' => $broker->tenant_id,
            ],
        ];
    }

    public function sendEmail(BrokerInvite $invite): void
    {
        $invite->loadMissing('tenant');

        Mail::to($invite->email)->send(new BrokerInviteMail($invite, $this->inviteUrl($invite)));
    }

    public function resend(BrokerInvite $invite): BrokerInvite
    {
        if ($invite->accepted_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite já foi aceito.'],
            ]);
        }

        $invite->update([
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        $this->sendEmail($invite->fresh());

        return $invite->fresh();
    }

    private function findPendingOrAcceptedInvite(string $token): ?BrokerInvite
    {
        return BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->where('token', $token)
            ->where(function ($query): void {
                $query->where(function ($pending): void {
                    $pending->whereNull('accepted_at')
                        ->where('expires_at', '>', now());
                })->orWhereNotNull('accepted_at');
            })
            ->first();
    }

    private function resolveBroker(
        BrokerInvite $invite,
        ?string $name,
        ?string $password,
        ?User $authenticatedBroker,
    ): User {
        if ($authenticatedBroker !== null) {
            if (strcasecmp($invite->email, $authenticatedBroker->email) !== 0) {
                throw ValidationException::withMessages([
                    'email' => ['Convite não pertence a este corretor.'],
                ]);
            }

            if ($authenticatedBroker->role !== 'broker') {
                throw ValidationException::withMessages([
                    'email' => ['Conta não autorizada como corretor.'],
                ]);
            }

            return $authenticatedBroker;
        }

        $existing = User::query()->where('email', $invite->email)->first();

        if ($existing !== null) {
            if ($existing->role !== 'broker') {
                throw ValidationException::withMessages([
                    'email' => ['E-mail já utilizado por outro tipo de conta.'],
                ]);
            }

            if ($password !== null) {
                $existing->update(['password' => Hash::make($password)]);
            }

            if ($name !== null && $name !== '') {
                $existing->update(['name' => $name]);
            }

            return $existing->fresh();
        }

        if ($name === null || $name === '' || $password === null || $password === '') {
            throw ValidationException::withMessages([
                'name' => ['Nome e senha são obrigatórios para criar a conta.'],
            ]);
        }

        return User::query()->create([
            'name' => $name,
            'email' => $invite->email,
            'password' => Hash::make($password),
            'role' => 'broker',
            'tenant_id' => null,
        ]);
    }
}
