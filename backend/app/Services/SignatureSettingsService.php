<?php

namespace App\Services;

use App\Enums\SignatureWitnessKind;
use App\Models\TenantSignatureSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RDP-008
 */
class SignatureSettingsService
{
    /**
     * @return array{proposal_signer_user_id: int|null, witness_slots: list<array{position: int, kind: string, user_id: int|null}>}
     */
    public function show(): array
    {
        $setting = TenantSignatureSetting::query()->with('witnessSlots')->first();

        if ($setting === null) {
            return [
                'proposal_signer_user_id' => null,
                'witness_slots' => [],
            ];
        }

        return $this->format($setting);
    }

    /**
     * @param  list<array{kind: string, user_id?: int|null}>  $slots
     * @return array{proposal_signer_user_id: int|null, witness_slots: list<array{position: int, kind: string, user_id: int|null}>}
     */
    public function save(User $actor, int $signerId, array $slots): array
    {
        $tenantId = (int) $actor->tenant_id;
        $this->assertTeamMember($tenantId, $signerId);
        $this->assertSlots($tenantId, $slots);

        $setting = DB::transaction(function () use ($tenantId, $signerId, $slots) {
            $setting = TenantSignatureSetting::query()->first() ?? new TenantSignatureSetting([
                'tenant_id' => $tenantId,
            ]);
            $setting->proposal_signer_user_id = $signerId;
            $setting->save();

            $setting->witnessSlots()->delete();

            foreach (array_values($slots) as $index => $slot) {
                $kind = SignatureWitnessKind::from($slot['kind']);

                $setting->witnessSlots()->create([
                    'tenant_id' => $tenantId,
                    'position' => $index + 1,
                    'kind' => $kind,
                    'user_id' => $kind === SignatureWitnessKind::SellingBroker ? null : (int) $slot['user_id'],
                ]);
            }

            return $setting->fresh('witnessSlots');
        });

        return $this->format($setting);
    }

    /**
     * @param  list<array{kind: string, user_id?: int|null}>  $slots
     */
    private function assertSlots(int $tenantId, array $slots): void
    {
        $userIds = [];

        foreach ($slots as $slot) {
            $kind = SignatureWitnessKind::from($slot['kind']);

            if ($kind === SignatureWitnessKind::SellingBroker) {
                if (! empty($slot['user_id'])) {
                    abort(422, 'A vaga do corretor da venda não leva uma pessoa fixa.');
                }

                continue;
            }

            $userId = isset($slot['user_id']) ? (int) $slot['user_id'] : 0;

            if ($userId === 0) {
                abort(422, 'Escolha a pessoa do time para cada vaga.');
            }

            $this->assertTeamMember($tenantId, $userId);
            $userIds[] = $userId;
        }

        if (count($userIds) !== count(array_unique($userIds))) {
            abort(422, 'A mesma pessoa não pode ocupar duas vagas.');
        }
    }

    private function assertTeamMember(int $tenantId, int $userId): void
    {
        $belongs = User::query()
            ->whereKey($userId)
            ->where('tenant_id', $tenantId)
            ->where('role', 'builder')
            ->exists();

        if (! $belongs) {
            abort(422, 'Escolha uma pessoa da sua equipe.');
        }
    }

    /**
     * @return array{proposal_signer_user_id: int|null, witness_slots: list<array{position: int, kind: string, user_id: int|null}>}
     */
    private function format(TenantSignatureSetting $setting): array
    {
        return [
            'proposal_signer_user_id' => $setting->proposal_signer_user_id,
            'witness_slots' => $setting->witnessSlots
                ->map(fn ($slot) => [
                    'position' => $slot->position,
                    'kind' => $slot->kind->value,
                    'user_id' => $slot->user_id,
                ])
                ->values()
                ->all(),
        ];
    }
}
