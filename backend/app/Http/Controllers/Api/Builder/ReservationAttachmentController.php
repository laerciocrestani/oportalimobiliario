<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReservationAttachmentController extends Controller
{
    public function file(Reservation $reservation, ReservationAttachment $attachment): StreamedResponse
    {
        $this->authorize('view', $reservation);
        $this->ensureAttachmentBelongsToReservation($reservation, $attachment);

        return Storage::disk('local')->response($attachment->path, $attachment->original_name, [
            'Content-Type' => $attachment->mime_type,
        ]);
    }

    protected function ensureAttachmentBelongsToReservation(
        Reservation $reservation,
        ReservationAttachment $attachment,
    ): void {
        if ((int) $attachment->reservation_id !== (int) $reservation->id) {
            abort(404);
        }
    }
}
