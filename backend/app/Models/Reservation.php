<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use App\Tenancy\Concerns\BelongsToTenant;
use Database\Factories\ReservationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id',
    'unit_id',
    'broker_id',
    'client_id',
            'status',
            'expires_at',
            'contract_template_id',
            'contract_values',
])]
class Reservation extends Model
{
    /** @use HasFactory<ReservationFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ReservationStatus::class,
            'expires_at' => 'datetime',
            'contract_values' => 'array',
        ];
    }

    /** @param Builder<Reservation> $query */
    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', ReservationStatus::Confirmed);
    }

    /** @param Builder<Reservation> $query */
    public function scopeListed(Builder $query): Builder
    {
        return $query->whereIn('status', [
            ReservationStatus::ProposalPending,
            ReservationStatus::ProposalReturned,
            ReservationStatus::Confirmed,
            ReservationStatus::DepositPending,
            ReservationStatus::DepositProofPending,
            ReservationStatus::ContractDataPending,
            ReservationStatus::ContractIssued,
        ]);
    }

    public function isPreHold(): bool
    {
        return $this->status === ReservationStatus::PreHold;
    }

    public function isProposalPending(): bool
    {
        return $this->status === ReservationStatus::ProposalPending;
    }

    public function isProposalReturned(): bool
    {
        return $this->status === ReservationStatus::ProposalReturned;
    }

    public function canSubmitProposal(): bool
    {
        return $this->isPreHold() || $this->isProposalReturned();
    }

    public function isDepositPending(): bool
    {
        return in_array($this->status, [
            ReservationStatus::Confirmed,
            ReservationStatus::DepositPending,
        ], true);
    }

    public function isDepositProofPending(): bool
    {
        return $this->status === ReservationStatus::DepositProofPending;
    }

    public function isContractDataPending(): bool
    {
        return $this->status === ReservationStatus::ContractDataPending;
    }

    public function isContractIssued(): bool
    {
        return $this->status === ReservationStatus::ContractIssued;
    }

    public function isCancelled(): bool
    {
        return $this->status === ReservationStatus::Cancelled;
    }

    public function isConfirmed(): bool
    {
        return in_array($this->status, [
            ReservationStatus::Confirmed,
            ReservationStatus::DepositPending,
            ReservationStatus::DepositProofPending,
            ReservationStatus::ContractDataPending,
            ReservationStatus::ContractIssued,
        ], true);
    }

    public function canSubmitDepositProof(): bool
    {
        return $this->isDepositPending();
    }

    public function canSubmitContractData(): bool
    {
        return $this->isContractDataPending();
    }

    public function contractTemplate(): BelongsTo
    {
        return $this->belongsTo(ContractTemplate::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(BrokerClient::class, 'client_id');
    }

    /** @return HasMany<ReservationMessage, $this> */
    public function messages(): HasMany
    {
        return $this->hasMany(ReservationMessage::class);
    }

    /** @return HasMany<ReservationTimelineEvent, $this> */
    public function timelineEvents(): HasMany
    {
        return $this->hasMany(ReservationTimelineEvent::class);
    }

    /** @return HasMany<ReservationProposal, $this> */
    public function proposals(): HasMany
    {
        return $this->hasMany(ReservationProposal::class);
    }

    /** @return HasMany<ReservationAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(ReservationAttachment::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
