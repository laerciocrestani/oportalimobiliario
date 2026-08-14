<?php

namespace Database\Factories;

use App\Enums\ReservationAttachmentKind;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReservationAttachment>
 */
class ReservationAttachmentFactory extends Factory
{
    protected $model = ReservationAttachment::class;

    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory(),
            'kind' => ReservationAttachmentKind::DepositProof,
            'path' => 'reservations/1/1/proof.pdf',
            'original_name' => 'comprovante.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'uploaded_by' => User::factory()->broker(),
        ];
    }

    public function depositProof(): static
    {
        return $this->state(fn () => ['kind' => ReservationAttachmentKind::DepositProof]);
    }

    public function contractDocumentation(): static
    {
        return $this->state(fn () => [
            'kind' => ReservationAttachmentKind::ContractDocumentation,
            'original_name' => 'rg.jpg',
            'mime_type' => 'image/jpeg',
        ]);
    }

    public function contractPdf(): static
    {
        return $this->state(fn () => [
            'kind' => ReservationAttachmentKind::ContractPdf,
            'original_name' => 'contrato.pdf',
        ]);
    }

    public function contractSigned(): static
    {
        return $this->state(fn () => [
            'kind' => ReservationAttachmentKind::ContractSigned,
            'original_name' => 'contrato-assinado.pdf',
        ]);
    }
}
