<?php

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Jobs\SendContractToZapSign;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

function contractReviewReservation(): array
{
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->withBuilderPermissions()->for($tenant)->create();
    $broker = User::factory()->broker()->create();
    $unit = Unit::factory()->for($tenant)->create([
        'code' => '501',
        'price' => 520000,
    ]);
    $reservation = Reservation::factory()->contractDataPending()->create([
        'tenant_id' => $tenant->id,
        'unit_id' => $unit->id,
        'broker_id' => $broker->id,
    ]);
    ReservationProposal::factory()->create([
        'reservation_id' => $reservation->id,
        'client_name' => 'Laércio Crestani',
        'client_cpf' => '52998224725',
        'address' => 'Travessa Natal',
    ]);
    $current = ContractTemplate::factory()->for($tenant)->create([
        'name' => 'Compra e venda padrão',
        'body_markdown' => 'Cliente {{nome_cliente}} na unidade {{codigo_unidade}}.',
    ]);
    $other = ContractTemplate::factory()->for($tenant)->create([
        'name' => 'Outro modelo',
        'body_markdown' => 'Outro texto da unidade {{codigo_unidade}}.',
    ]);

    return compact('tenant', 'builder', 'broker', 'reservation', 'current', 'other');
}

it('shows the filled contract and keeps edits on this reservation', function () {
    ['builder' => $builder, 'reservation' => $reservation, 'current' => $current, 'other' => $other] = contractReviewReservation();

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/contract/review")
        ->assertOk()
        ->assertJsonPath('template_id', $current->id)
        ->assertJsonPath('body', 'Cliente Laércio Crestani na unidade 501.');

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/review", [
        'template_id' => $other->id,
    ])->assertOk()
        ->assertJsonPath('template_id', $other->id)
        ->assertJsonPath('body', 'Outro texto da unidade 501.');

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/review", [
        'body' => 'Texto editado só desta reserva.',
    ])->assertOk()
        ->assertJsonPath('body', 'Texto editado só desta reserva.');

    expect($other->fresh()->body_markdown)->toBe('Outro texto da unidade {{codigo_unidade}}.')
        ->and($current->fresh()->body_markdown)->toContain('{{nome_cliente}}');
});

it('switches back to a model and discards the unsaved reservation edit', function () {
    ['builder' => $builder, 'reservation' => $reservation, 'current' => $current, 'other' => $other] = contractReviewReservation();

    Sanctum::actingAs($builder);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/review", [
        'body' => 'Edição local.',
    ])->assertOk();

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/review", [
        'template_id' => $current->id,
    ])->assertOk()
        ->assertJsonPath('body', 'Cliente Laércio Crestani na unidade 501.');

    expect($other->id)->not->toBe($current->id);
});

it('generates the pdf and queues signature only when the contract is accepted', function () {
    Storage::fake('local');
    Queue::fake();
    ['builder' => $builder, 'reservation' => $reservation] = contractReviewReservation();

    Sanctum::actingAs($builder);

    $this->getJson("/api/builder/reservations/{$reservation->id}/contract/review")->assertOk();

    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ContractPdf)->exists())->toBeFalse();

    $this->postJson("/api/builder/reservations/{$reservation->id}/contract/accept")
        ->assertCreated()
        ->assertJsonPath('status', ReservationStatus::ContractIssued->value);

    expect(ReservationAttachment::query()->where('kind', ReservationAttachmentKind::ContractPdf)->exists())->toBeTrue()
        ->and($reservation->fresh()->status)->toBe(ReservationStatus::ContractIssued);

    Queue::assertPushed(SendContractToZapSign::class);

    $this->patchJson("/api/builder/reservations/{$reservation->id}/contract/review", [
        'body' => 'Tarde demais.',
    ])->assertUnprocessable();
});

it('forbids contract review without the contracts permission and for the broker', function () {
    ['tenant' => $tenant, 'broker' => $broker, 'reservation' => $reservation] = contractReviewReservation();
    $staff = User::factory()->builder()->withBuilderPermissions([
        BuilderPermissions::CANCEL_RESERVATIONS,
    ])->for($tenant)->create();

    Sanctum::actingAs($staff);
    $this->getJson("/api/builder/reservations/{$reservation->id}/contract/review")->assertForbidden();

    Sanctum::actingAs($broker);
    $this->getJson("/api/broker/reservations/{$reservation->id}/contract/review")->assertNotFound();
});
