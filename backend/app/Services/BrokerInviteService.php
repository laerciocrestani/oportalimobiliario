<?php

namespace App\Services;

use App\Enums\BrokerInviteChannel;
use App\Enums\BrokerInviteDeliveryStatus;
use App\Jobs\SendBrokerInviteWhatsAppJob;
use App\Mail\BrokerInviteMail;
use App\Models\BrokerInvite;
use App\Models\BrokerTenant;
use App\Models\User;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BrokerInviteService
{
    public const INDIVIDUAL_INVITE_EXISTS_MESSAGE = 'Você já recebeu um convite individual. Acesse o link enviado por e-mail ou WhatsApp.';

    public function __construct(private PhoneNumberNormalizer $phoneNumberNormalizer) {}

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

        if ($invite->revoked_at !== null) {
            return 'revoked';
        }

        if ($invite->declined_at !== null) {
            return 'declined';
        }

        if ($invite->expires_at->isPast()) {
            return 'expired';
        }

        return 'pending';
    }

    /**
     * @return array{
     *     name: string,
     *     email: string|null,
     *     requires_email: bool,
     *     tenant_name: string,
     *     status: string,
     *     expires_at: string|null
     * }
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
            'name' => $invite->name,
            'email' => $invite->email,
            'requires_email' => $invite->email === null,
            'tenant_name' => $invite->tenant->name,
            'status' => $this->status($invite),
            'expires_at' => $invite->expires_at->toIso8601String(),
        ];
    }

    /**
     * @return array{token: string, user: array{id: int, name: string, email: string, role: string, tenant_id: int|null}}
     */
    public function accept(
        string $token,
        ?string $name = null,
        ?string $password = null,
        ?string $email = null,
        ?User $authenticatedBroker = null,
    ): array {
        $invite = BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->with('tenant')
            ->where('token', $token)
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if ($invite === null) {
            throw ValidationException::withMessages([
                'token' => ['Convite inválido ou expirado.'],
            ]);
        }

        $resolvedEmail = $invite->email ?? $email;

        if ($resolvedEmail === null || $resolvedEmail === '') {
            throw ValidationException::withMessages([
                'email' => ['E-mail é obrigatório para aceitar o convite.'],
            ]);
        }

        $resolvedName = $name !== null && $name !== '' ? $name : $invite->name;

        $broker = $this->resolveBroker($invite, $resolvedName, $resolvedEmail, $password, $authenticatedBroker);

        $invite->update([
            'broker_id' => $broker->id,
            'accepted_at' => now(),
            'email' => $resolvedEmail,
            'name' => $resolvedName,
        ]);

        $brokerTenant = BrokerTenant::query()->firstOrNew([
            'tenant_id' => $invite->tenant_id,
            'broker_id' => $broker->id,
        ]);

        $brokerTenant->fill([
            'broker_invite_id' => $invite->id,
            'accepted_at' => $brokerTenant->accepted_at ?? now(),
            'approved_at' => now(),
        ]);
        $brokerTenant->save();

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

    public function dispatch(BrokerInvite $invite): void
    {
        match ($invite->channel) {
            BrokerInviteChannel::Email => $this->sendEmail($invite),
            BrokerInviteChannel::WhatsApp => $this->sendWhatsApp($invite),
            BrokerInviteChannel::Link => null,
        };
    }

    public function sendEmail(BrokerInvite $invite): void
    {
        if ($invite->email === null || $invite->email === '') {
            throw ValidationException::withMessages([
                'email' => ['E-mail é obrigatório para envio por e-mail.'],
            ]);
        }

        $invite->loadMissing('tenant');

        Mail::to($invite->email)->send(new BrokerInviteMail($invite, $this->inviteUrl($invite)));
    }

    public function sendWhatsApp(BrokerInvite $invite): void
    {
        if ($invite->phone === null || $invite->phone === '') {
            throw ValidationException::withMessages([
                'phone' => ['Telefone é obrigatório para envio por WhatsApp.'],
            ]);
        }

        $invite->update([
            'delivery_status' => BrokerInviteDeliveryStatus::Pending,
            'delivery_error' => null,
        ]);

        SendBrokerInviteWhatsAppJob::dispatch($invite->id);
    }

    public function declineFromWhatsApp(BrokerInvite $invite): void
    {
        if ($invite->accepted_at !== null || $invite->declined_at !== null) {
            return;
        }

        $invite->update(['declined_at' => now()]);
    }

    public function resend(BrokerInvite $invite): BrokerInvite
    {
        if ($invite->accepted_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite já foi aceito.'],
            ]);
        }

        if ($invite->declined_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite foi recusado.'],
            ]);
        }

        if ($invite->revoked_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite foi revogado. Reative antes de reenviar.'],
            ]);
        }

        $invite->update([
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
            'last_sent_at' => now(),
            'declined_at' => null,
            'revoked_at' => null,
            'whatsapp_message_id' => null,
            'delivery_status' => null,
            'delivery_error' => null,
        ]);

        $this->dispatch($invite->fresh());

        return $invite->fresh();
    }

    public function revoke(BrokerInvite $invite): BrokerInvite
    {
        if ($invite->accepted_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite já foi aceito. Inative o corretor em Corretores.'],
            ]);
        }

        if ($invite->revoked_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite já foi revogado.'],
            ]);
        }

        $invite->update(['revoked_at' => now()]);

        return $invite->fresh();
    }

    public function reactivate(BrokerInvite $invite): BrokerInvite
    {
        if ($invite->accepted_at !== null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite já foi aceito.'],
            ]);
        }

        if ($invite->revoked_at === null) {
            throw ValidationException::withMessages([
                'invite' => ['Convite não está revogado.'],
            ]);
        }

        $invite->update([
            'revoked_at' => null,
            'expires_at' => now()->addDays(7),
            'declined_at' => null,
        ]);

        return $invite->fresh();
    }

    public function normalizePhone(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        return $this->phoneNumberNormalizer->toE164($phone);
    }

    public function assertCanCreateInvite(
        int $tenantId,
        BrokerInviteChannel $channel,
        ?string $email,
        ?string $phone,
    ): void {
        if ($channel === BrokerInviteChannel::Email) {
            $this->assertNoDuplicateEmailInvite($tenantId, $email);
            $this->assertBrokerNotLinkedByEmail($tenantId, $email);

            return;
        }

        if ($channel === BrokerInviteChannel::WhatsApp) {
            $this->assertNoDuplicatePhoneInvite($tenantId, $phone);
            $this->assertBrokerNotLinkedByPhone($tenantId, $phone);
        }
    }

    public function assertNoOpenIndividualInviteForJoin(int $tenantId, string $email, ?string $phone): void
    {
        $invite = $this->findOpenInviteForContact($tenantId, $email, $phone);

        if ($invite === null) {
            return;
        }

        $normalizedEmail = strtolower(trim($email));
        $matchedByEmail = $invite->email !== null
            && strtolower(trim($invite->email)) === $normalizedEmail;

        throw ValidationException::withMessages([
            $matchedByEmail ? 'email' : 'phone' => [
                self::INDIVIDUAL_INVITE_EXISTS_MESSAGE,
            ],
            'invite_resend' => ['1'],
        ]);
    }

    public function reconcileOpenInviteOnApproval(BrokerTenant $link): void
    {
        $link->loadMissing('broker');

        $invite = $this->findOpenInviteForContact(
            $link->tenant_id,
            $link->broker->usesSyntheticEmail() ? null : $link->broker->email,
            $link->broker->phone,
        );

        if ($invite === null) {
            return;
        }

        $invite->update([
            'broker_id' => $link->broker_id,
            'accepted_at' => now(),
            'name' => $link->broker->name,
            ...(! $link->broker->usesSyntheticEmail() ? ['email' => $link->broker->email] : []),
        ]);

        $link->update(['broker_invite_id' => $invite->id]);
    }

    public function findOpenInviteForContact(int $tenantId, ?string $email, ?string $phone): ?BrokerInvite
    {
        $normalizedEmail = $email !== null ? strtolower(trim($email)) : null;
        $normalizedPhone = $phone !== null && $phone !== '' ? $phone : null;

        if (($normalizedEmail === null || $normalizedEmail === '') && $normalizedPhone === null) {
            return null;
        }

        return BrokerInvite::query()
            ->where('tenant_id', $tenantId)
            ->open()
            ->where(function ($query) use ($normalizedEmail, $normalizedPhone): void {
                if ($normalizedEmail !== null && $normalizedEmail !== '') {
                    $query->where(function ($contact) use ($normalizedEmail, $normalizedPhone): void {
                        $contact->whereRaw('LOWER(email) = ?', [$normalizedEmail]);

                        if ($normalizedPhone !== null) {
                            $contact->orWhere('phone', $normalizedPhone);
                        }
                    });
                } elseif ($normalizedPhone !== null) {
                    $query->where('phone', $normalizedPhone);
                }
            })
            ->first();
    }

    private function assertNoDuplicateEmailInvite(int $tenantId, ?string $email): void
    {
        if ($email === null || trim($email) === '') {
            return;
        }

        $exists = BrokerInvite::query()
            ->where('tenant_id', $tenantId)
            ->open()
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'email' => ['Já existe um convite em aberto para este e-mail. Reenvie ou revogue o convite existente.'],
            ]);
        }
    }

    private function assertNoDuplicatePhoneInvite(int $tenantId, ?string $phone): void
    {
        if ($phone === null || $phone === '') {
            return;
        }

        $exists = BrokerInvite::query()
            ->where('tenant_id', $tenantId)
            ->open()
            ->where('phone', $phone)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'phone' => ['Já existe um convite em aberto para este telefone. Reenvie ou revogue o convite existente.'],
            ]);
        }
    }

    private function assertBrokerNotLinkedByEmail(int $tenantId, ?string $email): void
    {
        if ($email === null || trim($email) === '') {
            return;
        }

        $broker = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower(trim($email))])
            ->first();

        if ($broker === null) {
            return;
        }

        $this->assertBrokerTenantLink($tenantId, $broker->id, 'email');
    }

    private function assertBrokerNotLinkedByPhone(int $tenantId, ?string $phone): void
    {
        if ($phone === null || $phone === '') {
            return;
        }

        $broker = User::query()->where('phone', $phone)->first();

        if ($broker === null) {
            return;
        }

        $this->assertBrokerTenantLink($tenantId, $broker->id, 'phone');
    }

    private function assertBrokerTenantLink(int $tenantId, int $brokerId, string $field): void
    {
        $link = BrokerTenant::query()
            ->where('tenant_id', $tenantId)
            ->where('broker_id', $brokerId)
            ->first();

        if ($link === null) {
            return;
        }

        if ($link->isPendingApproval()) {
            throw ValidationException::withMessages([
                $field => ['Já existe uma solicitação pendente para este contato.'],
            ]);
        }

        if ($link->isActive()) {
            throw ValidationException::withMessages([
                $field => ['Este corretor já está vinculado a esta construtora.'],
            ]);
        }
    }

    private function findPendingOrAcceptedInvite(string $token): ?BrokerInvite
    {
        return BrokerInvite::query()
            ->withoutGlobalScope('tenant')
            ->where('token', $token)
            ->where(function ($query): void {
                $query->where(function ($pending): void {
                    $pending->whereNull('accepted_at')
                        ->whereNull('declined_at')
                        ->whereNull('revoked_at')
                        ->where('expires_at', '>', now());
                })->orWhereNotNull('accepted_at');
            })
            ->first();
    }

    private function resolveBroker(
        BrokerInvite $invite,
        string $name,
        string $email,
        ?string $password,
        ?User $authenticatedBroker,
    ): User {
        if ($authenticatedBroker !== null) {
            if (strcasecmp($email, $authenticatedBroker->email) !== 0) {
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

        $existing = User::query()->where('email', $email)->first();

        if ($existing !== null) {
            if ($existing->role !== 'broker') {
                throw ValidationException::withMessages([
                    'email' => ['E-mail já utilizado por outro tipo de conta.'],
                ]);
            }

            if ($password !== null) {
                $existing->update(['password' => Hash::make($password)]);
            }

            if ($name !== '') {
                $existing->update(['name' => $name]);
            }

            return $existing->fresh();
        }

        if ($password === null || $password === '') {
            throw ValidationException::withMessages([
                'password' => ['Senha é obrigatória para criar a conta.'],
            ]);
        }

        return User::query()->create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'broker',
            'tenant_id' => null,
        ]);
    }
}
