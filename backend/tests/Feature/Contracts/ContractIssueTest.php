<?php

/**
 * @see REQ-CTR-008
 * @see REQ-CTR-009
 * @see REQ-CTR-010
 * @see REQ-CTR-011
 */
use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Models\Building;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\ReservationTimelineEvent;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function createReservationReadyForContractIssue(Tenant $tenant, User $broker): Reservation
{
    $building = Building::factory()->for($tenant)->create();
    $unit = Unit::factory()->for($tenant)->for($building)->create([
        'code' => '101',
        'price' => 450000,
        'status' => \App\Enums\UnitStatus::Reserved,
    ]);

    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);

    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'client_name' => 'Maria Silva',
        'client_cpf' => '52998224725',
        'submitted_by' => $broker->id,
    ]);

    ReservationTimelineEvent::factory()->create([
        'reservation_id' => $reservation->id,
        'type' => ReservationTimelineEventType::ContractDataSubmitted,
        'actor_id' => $broker->id,
    ]);

    return $reservation;
}

it('issues a contract pdf from an active template and freezes the price', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createReservationReadyForContractIssue($tenant, $broker);
    $template = ContractTemplate::factory()->for($tenant)->create([
        'name' => 'Compra e venda',
        'body_markdown' => 'Cliente {{nome_cliente}} compra a unidade {{codigo_unidade}} por {{preco_final}}.',
    ]);

    Sanctum::actingAs($builder);

    $response = $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => ['nome_cliente' => 'Maria Silva'],
        'final_price_brl' => 460000.5,
    ])->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ContractIssued->value);

    $reservation->refresh()->load('unit');
    $attachment = ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ContractPdf)->first();

    expect($reservation->status)->toBe(ReservationStatus::ContractIssued)
        ->and((float) $reservation->unit->frozen_price_brl)->toBe(460000.5)
        ->and($attachment)->not->toBeNull()
        ->and(Storage::disk('local')->get($attachment->path))->toStartWith('%PDF')
        ->and(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractIssued)->count())->toBe(1);
});

it('replaces the previous pdf when reissuing', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createReservationReadyForContractIssue($tenant, $broker);
    $template = ContractTemplate::factory()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 100000,
    ])->assertCreated();

    $firstPath = ReservationAttachment::query()->first()->path;

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 110000,
    ])->assertCreated();

    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ContractPdf)->count())->toBe(1)
        ->and(Storage::disk('local')->exists($firstPath))->toBeFalse()
        ->and(ReservationTimelineEvent::query()->where('type', ReservationTimelineEventType::ContractIssued)->count())->toBe(2);
});

it('blocks issue when a required custom variable is empty', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createReservationReadyForContractIssue($tenant, $broker);
    $template = ContractTemplate::factory()->for($tenant)->create([
        'body_markdown' => 'Comissão {{comissao_extra}}',
        'custom_variables' => [['slug' => 'comissao_extra', 'label' => 'Comissão extra']],
    ]);

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => ['comissao_extra' => ''],
        'final_price_brl' => 100000,
    ])->assertUnprocessable();
});

it('rejects inactive templates on issue and preview', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createReservationReadyForContractIssue($tenant, $broker);
    $template = ContractTemplate::factory()->inactive()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/contract/preview?template_id={$template->id}")
        ->assertUnprocessable();

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 100000,
    ])->assertUnprocessable();
});

it('forbids issuing without reservations.cancel', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::MANAGE_CONTRACTS,
    ])->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $reservation = createReservationReadyForContractIssue($tenant, $broker);
    $template = ContractTemplate::factory()->for($tenant)->create();

    Sanctum::actingAs($builder);

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 100000,
    ])->assertForbidden();
});

it('lets the owning broker download the issued contract pdf', function () {
    Storage::fake('local');

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    linkBrokerToTenant($broker, $tenant);
    $reservation = createReservationReadyForContractIssue($tenant, $broker);
    $template = ContractTemplate::factory()->for($tenant)->create();

    Sanctum::actingAs($builder);
    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/issue", [
        'contract_template_id' => $template->id,
        'values' => [],
        'final_price_brl' => 100000,
    ])->assertCreated();

    $attachment = ReservationAttachment::query()->first();

    Sanctum::actingAs($broker);
    $this->get("/api/broker/reservations/{$reservation->id}/attachments/{$attachment->id}/file")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    $this->getJson("/api/broker/reservations/{$reservation->id}/timeline")
        ->assertOk()
        ->assertJsonPath('attachments.0.kind', ReservationAttachmentKind::ContractPdf->value);
});
