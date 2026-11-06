<?php

namespace App\Services;

use App\Mail\BrokerAccessRequestMail;
use App\Models\BrokerBuildingRequest;
use App\Models\BrokerTenant;
use App\Models\Building;
use App\Models\BuildingAccess;
use App\Models\User;
use App\Support\BuilderContact;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class BrokerBuildingRequestService
{
    public const PENDING_MESSAGE = 'Pedido enviado para a construtora.';

    public const ALREADY_PENDING_MESSAGE = 'Pedido já enviado para a construtora.';

    public function __construct(
        private PhoneNumberNormalizer $phones,
        private BrokerEmailConfirmationService $emailConfirmations,
    ) {}

    /**
     * @return array{email_confirmation_required: true, message: string}
     */
    public function register(Building $building, string $name, string $phone, string $email, string $password): array
    {
        $this->assertPublished($building);
        $normalizedPhone = $this->requirePhone($phone);
        $email = mb_strtolower(trim($email));
        $this->assertContactIsFree($normalizedPhone, $email);

        $broker = DB::transaction(function () use ($building, $name, $normalizedPhone, $email, $password): User {
            $broker = User::query()->create([
                'name' => trim($name),
                'email' => $email,
                'phone' => $normalizedPhone,
                'password' => $password,
                'role' => 'broker',
                'tenant_id' => null,
            ]);

            $this->ensurePendingLink($broker, $building);
            $this->ensureRequest($broker, $building);

            return $broker;
        });

        $this->notifyBuilder($building, $broker);
        $this->emailConfirmations->send($broker);

        return [
            'email_confirmation_required' => true,
            'message' => BrokerEmailConfirmationService::MESSAGE,
        ];
    }

    /**
     * @return array{message: string, status: string}
     */
    public function request(User $broker, Building $building): array
    {
        $this->assertPublished($building);
        $this->assertBroker($broker);

        $link = $this->linkFor($broker, $building);

        if ($link?->isInactive()) {
            throw ValidationException::withMessages([
                'broker' => ['Seu acesso a esta construtora está inativo.'],
            ]);
        }

        if ($this->alreadyGranted($broker, $building)) {
            throw ValidationException::withMessages([
                'building' => ['Você já pode comercializar este empreendimento.'],
            ]);
        }

        $created = false;

        DB::transaction(function () use ($broker, $building, &$created): void {
            $this->ensurePendingLink($broker, $building);
            $created = $this->ensureRequest($broker, $building);
        });

        if ($created) {
            $this->notifyBuilder($building, $broker);
        }

        return [
            'message' => $created ? self::PENDING_MESSAGE : self::ALREADY_PENDING_MESSAGE,
            'status' => $created ? 'pending' : 'already_pending',
        ];
    }

    public function approve(BrokerBuildingRequest $request, int $tenantId, User $actor): BuildingAccess
    {
        $this->assertSameTenant($request, $tenantId);
        $request->loadMissing('building');

        return DB::transaction(function () use ($request, $tenantId, $actor): BuildingAccess {
            $link = BrokerTenant::query()
                ->where('tenant_id', $tenantId)
                ->where('broker_id', $request->broker_id)
                ->first();

            if ($link === null) {
                throw ValidationException::withMessages([
                    'broker' => ['Corretor não pertence a esta construtora.'],
                ]);
            }

            if ($link->isPendingApproval()) {
                $link->update(['approved_at' => now()]);
            }

            $access = BuildingAccess::query()->firstOrCreate([
                'broker_id' => $request->broker_id,
                'building_id' => $request->building_id,
            ], [
                'tenant_id' => $tenantId,
            ]);

            if ($access->wasRecentlyCreated) {
                app(UserActivityCatalog::class)->recordBuildingAccessGranted($actor, $access);
            }

            $request->delete();

            return $access;
        });
    }

    public function reject(BrokerBuildingRequest $request, int $tenantId): void
    {
        $this->assertSameTenant($request, $tenantId);

        DB::transaction(function () use ($request, $tenantId): void {
            $brokerId = $request->broker_id;
            $request->delete();

            $stillPending = BrokerBuildingRequest::query()
                ->where('tenant_id', $tenantId)
                ->where('broker_id', $brokerId)
                ->exists();

            if ($stillPending) {
                return;
            }

            $link = BrokerTenant::query()
                ->where('tenant_id', $tenantId)
                ->where('broker_id', $brokerId)
                ->pendingApproval()
                ->first();

            $link?->delete();
        });
    }

    private function assertPublished(Building $building): void
    {
        if (! $building->published) {
            abort(404);
        }
    }

    private function assertBroker(User $broker): void
    {
        if ($broker->role !== 'broker') {
            throw ValidationException::withMessages([
                'broker' => ['Esta entrada é para corretores.'],
            ]);
        }
    }

    private function requirePhone(string $phone): string
    {
        $normalized = $this->phones->toE164($phone);

        if ($normalized === null || ! preg_match('/^\+55\d{10,11}$/', $normalized)) {
            throw ValidationException::withMessages([
                'phone' => ['Informe um telefone válido com DDD.'],
            ]);
        }

        return $normalized;
    }

    private function assertContactIsFree(string $phone, string $email): void
    {
        $existing = User::query()
            ->where('phone', $phone)
            ->orWhere('email', $email)
            ->first();

        if ($existing === null) {
            return;
        }

        $message = $existing->role === 'broker'
            ? 'Já existe uma conta de corretor com estes dados. Entre para continuar.'
            : 'Este telefone ou e-mail já está em uso.';

        throw ValidationException::withMessages([
            'email' => [$message],
        ]);
    }

    private function linkFor(User $broker, Building $building): ?BrokerTenant
    {
        return BrokerTenant::query()
            ->where('tenant_id', $building->tenant_id)
            ->where('broker_id', $broker->id)
            ->first();
    }

    private function alreadyGranted(User $broker, Building $building): bool
    {
        return BuildingAccess::query()
            ->where('broker_id', $broker->id)
            ->where('building_id', $building->id)
            ->exists();
    }

    private function ensurePendingLink(User $broker, Building $building): BrokerTenant
    {
        $link = $this->linkFor($broker, $building);

        if ($link !== null) {
            return $link;
        }

        return BrokerTenant::query()->create([
            'tenant_id' => $building->tenant_id,
            'broker_id' => $broker->id,
            'accepted_at' => now(),
            'approved_at' => null,
        ]);
    }

    private function ensureRequest(User $broker, Building $building): bool
    {
        $request = BrokerBuildingRequest::query()->firstOrCreate([
            'broker_id' => $broker->id,
            'building_id' => $building->id,
        ], [
            'tenant_id' => $building->tenant_id,
        ]);

        return $request->wasRecentlyCreated;
    }

    private function assertSameTenant(BrokerBuildingRequest $request, int $tenantId): void
    {
        if ($request->tenant_id !== $tenantId) {
            abort(404);
        }
    }

    private function notifyBuilder(Building $building, User $broker): void
    {
        $building->loadMissing('tenant.builderUsers');
        $email = BuilderContact::for($building)['email'] ?? null;

        if ($email === null || $email === '') {
            return;
        }

        try {
            Mail::to($email)->send(new BrokerAccessRequestMail(
                brokerName: $broker->name,
                phone: $broker->phone ?? '',
                email: $broker->usesSyntheticEmail() ? null : $broker->email,
                buildingName: $building->name,
            ));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
