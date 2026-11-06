<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Services\ReservationProposalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReservationAttachmentController extends Controller
{
    public function __construct(
        private readonly ReservationProposalService $proposalService,
    ) {}

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        $data = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:10'],
            'files.*' => ['file'],
        ]);

        $attachments = $this->proposalService->addDocuments(
            $request->user(),
            $reservation,
            $data['files'],
        );

        return response()->json(['attachments' => $attachments], 201);
    }

    public function file(Reservation $reservation, ReservationAttachment $attachment): StreamedResponse
    {
        if ($reservation->broker_id !== request()->user()->id) {
            abort(403);
        }

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
