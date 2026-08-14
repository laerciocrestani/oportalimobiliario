<?php

namespace App\Models;

use App\Enums\ProposalDecision;
use Database\Factories\ReservationProposalFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'reservation_id',
    'version',
    'client_name',
    'client_email',
    'client_phone',
    'client_cpf',
    'client_rg',
    'address',
    'city',
    'state',
    'zip',
    'marital_status',
    'nationality',
    'spouse_name',
    'spouse_phone',
    'spouse_email',
    'spouse_cpf',
    'spouse_rg',
    'spouse_nationality',
    'land_value',
    'payment_terms',
    'decision',
    'decision_note',
    'submitted_by',
    'decided_by',
    'decided_at',
])]
class ReservationProposal extends Model
{
    /** @use HasFactory<ReservationProposalFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'land_value' => 'decimal:2',
            'decision' => ProposalDecision::class,
            'decided_at' => 'datetime',
        ];
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function isPending(): bool
    {
        return $this->decision === null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'version' => $this->version,
            'client_name' => $this->client_name,
            'client_email' => $this->client_email,
            'client_phone' => $this->client_phone,
            'client_cpf' => $this->client_cpf,
            'client_rg' => $this->client_rg,
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'zip' => $this->zip,
            'marital_status' => $this->marital_status,
            'nationality' => $this->nationality,
            'spouse_name' => $this->spouse_name,
            'spouse_phone' => $this->spouse_phone,
            'spouse_email' => $this->spouse_email,
            'spouse_cpf' => $this->spouse_cpf,
            'spouse_rg' => $this->spouse_rg,
            'spouse_nationality' => $this->spouse_nationality,
            'land_value' => (float) $this->land_value,
            'payment_terms' => $this->payment_terms,
            'decision' => $this->decision?->value,
            'decision_note' => $this->decision_note,
            'submitted_by' => $this->submitted_by,
            'decided_by' => $this->decided_by,
            'decided_at' => $this->decided_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
