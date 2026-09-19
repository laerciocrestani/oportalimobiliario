<?php

namespace App\Models;

use Database\Factories\ReservationMessageReadFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'reservation_id',
    'user_id',
    'last_read_message_id',
])]
class ReservationMessageRead extends Model
{
    /** @use HasFactory<ReservationMessageReadFactory> */
    use HasFactory;

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lastReadMessage(): BelongsTo
    {
        return $this->belongsTo(ReservationMessage::class, 'last_read_message_id');
    }
}
