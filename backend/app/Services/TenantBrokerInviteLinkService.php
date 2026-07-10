<?php

namespace App\Services;

use App\Models\BrokerTenant;
use App\Models\TenantBrokerInviteLink;
use App\Models\User;
use App\Enums\BrokerInviteChannel;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TenantBrokerInviteLinkService
{
    public function __construct(
        private PhoneNumberNormalizer $phoneNumberNormalizer,
        private BrokerInviteService $brokerInviteService,
    ) {}

    public function getOrCreateForTenant(int $tenantId, int $createdByUserId): TenantBrokerInviteLink
    {
        $existing = TenantBrokerInviteLink::query()
            ->where('tenant_id', $tenantId)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        return TenantBrokerInviteLink::query()->create([
            'tenant_id' => $tenantId,
            'created_by' => $createdByUserId,
            'token' => Str::random(48),
        ]);
    }

    public function regenerate(TenantBrokerInviteLink $link, int $userId): TenantBrokerInviteLink
    {
        $link->update([
            'token' => Str::random(48),
            'created_by' => $userId,
            'regenerated_at' => now(),
        ]);

        return $link->fresh();
    }

    public function inviteUrl(TenantBrokerInviteLink $link): string
    {
        $base = rtrim((string) config('opim.frontend_urls.broker'), '/');

        return "{$base}/join/{$link->token}";
    }

    /**
     * @return array{
     *     tenant_name: string,
     *     type: string
     * }
     */
    public function preview(string $token): array
    {
        $link = $this->findLinkByToken($token);

        if ($link === null) {
            throw ValidationException::withMessages([
                'token' => ['Link de convite inválido.'],
            ]);
        }

        $link->loadMissing('tenant');

        return [
            'tenant_name' => $link->tenant->name,
            'type' => 'open',
        ];
    }

    /**
     * @return array{
     *     token: string,
     *     pending_approval: bool,
     *     user: array{id: int, name: string, email: string, role: string, tenant_id: int|null}
     * }
     */
    public function register(
        string $token,
        string $name,
        string $phone,
        string $email,
        string $password,
    ): array {
        $link = $this->findLinkByToken($token);

        if ($link === null) {
            throw ValidationException::withMessages([
                'token' => ['Link de convite inválido.'],
            ]);
        }

        $normalizedPhone = $this->phoneNumberNormalizer->toE164($phone);

        if ($normalizedPhone === null) {
            throw ValidationException::withMessages([
                'phone' => ['Informe um telefone válido com DDD.'],
            ]);
        }

        $resolvedEmail = trim($email);

        if ($resolvedEmail === '') {
            throw ValidationException::withMessages([
                'email' => ['E-mail é obrigatório.'],
            ]);
        }

        $this->brokerInviteService->assertNoOpenIndividualInviteForJoin(
            $link->tenant_id,
            $resolvedEmail,
            $normalizedPhone,
        );

        $existingLinkByEmail = BrokerTenant::query()
            ->withoutGlobalScope('tenant')
            ->where('tenant_id', $link->tenant_id)
            ->whereHas('broker', fn ($query) => $query->whereRaw('LOWER(email) = ?', [strtolower($resolvedEmail)]))
            ->first();

        if ($existingLinkByEmail !== null) {
            if ($existingLinkByEmail->isPendingApproval()) {
                throw ValidationException::withMessages([
                    'email' => ['Já existe uma solicitação pendente para este e-mail.'],
                ]);
            }

            throw ValidationException::withMessages([
                'email' => ['Este corretor já está vinculado a esta construtora.'],
            ]);
        }

        $existingLink = BrokerTenant::query()
            ->withoutGlobalScope('tenant')
            ->where('tenant_id', $link->tenant_id)
            ->whereHas('broker', fn ($query) => $query->where('phone', $normalizedPhone))
            ->first();

        if ($existingLink !== null) {
            if ($existingLink->isPendingApproval()) {
                throw ValidationException::withMessages([
                    'phone' => ['Já existe uma solicitação pendente para este telefone.'],
                ]);
            }

            throw ValidationException::withMessages([
                'phone' => ['Este corretor já está vinculado a esta construtora.'],
            ]);
        }

        $broker = $this->resolveBroker($name, $normalizedPhone, $resolvedEmail, $password);

        BrokerTenant::query()->create([
            'tenant_id' => $link->tenant_id,
            'broker_id' => $broker->id,
            'tenant_broker_invite_link_id' => $link->id,
            'accepted_at' => now(),
            'approved_at' => null,
        ]);

        $apiToken = $broker->createToken('api')->plainTextToken;

        return [
            'token' => $apiToken,
            'pending_approval' => true,
            'user' => [
                'id' => $broker->id,
                'name' => $broker->name,
                'email' => $broker->email,
                'role' => $broker->role,
                'tenant_id' => $broker->tenant_id,
            ],
        ];
    }

    public function approve(BrokerTenant $link, int $tenantId): BrokerTenant
    {
        if ($link->tenant_id !== $tenantId) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor não pertence a esta construtora.'],
            ]);
        }

        if ($link->isApproved()) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor já foi aprovado.'],
            ]);
        }

        $link->update(['approved_at' => now()]);

        $this->brokerInviteService->reconcileOpenInviteOnApproval($link);

        return $link->fresh();
    }

    /**
     * @return array{channel: string, message: string}
     */
    public function resendIndividualInvite(string $openLinkToken, string $email, string $phone): array
    {
        $link = $this->findLinkByToken($openLinkToken);

        if ($link === null) {
            throw ValidationException::withMessages([
                'token' => ['Link de convite inválido.'],
            ]);
        }

        $normalizedPhone = $this->phoneNumberNormalizer->toE164($phone);

        if ($normalizedPhone === null) {
            throw ValidationException::withMessages([
                'phone' => ['Informe um telefone válido com DDD.'],
            ]);
        }

        $resolvedEmail = trim($email);

        if ($resolvedEmail === '') {
            throw ValidationException::withMessages([
                'email' => ['E-mail é obrigatório.'],
            ]);
        }

        $invite = $this->brokerInviteService->findOpenInviteForContact(
            $link->tenant_id,
            $resolvedEmail,
            $normalizedPhone,
        );

        if ($invite === null) {
            throw ValidationException::withMessages([
                'email' => ['Não encontramos um convite individual em aberto para estes dados.'],
            ]);
        }

        $invite = $this->brokerInviteService->resend($invite);

        $message = match ($invite->channel) {
            BrokerInviteChannel::Email => 'Convite reenviado para o seu e-mail.',
            BrokerInviteChannel::WhatsApp => 'Convite reenviado para o seu WhatsApp.',
            default => 'Convite reenviado.',
        };

        return [
            'channel' => $invite->channel->value,
            'message' => $message,
        ];
    }

    public function reject(BrokerTenant $link, int $tenantId): void
    {
        if ($link->tenant_id !== $tenantId) {
            throw ValidationException::withMessages([
                'broker' => ['Corretor não pertence a esta construtora.'],
            ]);
        }

        if ($link->isApproved()) {
            throw ValidationException::withMessages([
                'broker' => ['Não é possível recusar um corretor já aprovado.'],
            ]);
        }

        $link->delete();
    }

    private function findLinkByToken(string $token): ?TenantBrokerInviteLink
    {
        return TenantBrokerInviteLink::query()
            ->withoutGlobalScope('tenant')
            ->where('token', $token)
            ->first();
    }

    private function resolveBroker(
        string $name,
        string $phone,
        string $email,
        string $password,
    ): User {
        $existingByPhone = User::query()->where('phone', $phone)->first();

        if ($existingByPhone !== null) {
            if ($existingByPhone->role !== 'broker') {
                throw ValidationException::withMessages([
                    'phone' => ['Telefone já utilizado por outro tipo de conta.'],
                ]);
            }

            $existingByPhone->update([
                'name' => $name,
                'password' => Hash::make($password),
            ]);

            return $existingByPhone->fresh();
        }

        $existingByEmail = User::query()->where('email', $email)->first();

        if ($existingByEmail !== null) {
            if ($existingByEmail->role !== 'broker') {
                throw ValidationException::withMessages([
                    'email' => ['E-mail já utilizado por outro tipo de conta.'],
                ]);
            }

            $existingByEmail->update([
                'name' => $name,
                'phone' => $phone,
                'password' => Hash::make($password),
            ]);

            return $existingByEmail->fresh();
        }

        return User::query()->create([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => Hash::make($password),
            'role' => 'broker',
            'tenant_id' => null,
        ]);
    }
}
