<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ReservationContractDataService;
use App\Support\ReservationContractDataRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RTL-018
 */
class ReservationContractDataController extends Controller
{
    public function __construct(
        private readonly ReservationContractDataService $contractDataService,
    ) {}

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $clientCpf = preg_replace('/\D+/', '', (string) $request->input('client_cpf', '')) ?? '';
        $spouseCpf = preg_replace('/\D+/', '', (string) $request->input('spouse_cpf', '')) ?? '';

        $request->merge([
            'client_cpf' => $clientCpf,
            'spouse_cpf' => $spouseCpf === '' ? null : $spouseCpf,
        ]);

        $validated = $request->validate(ReservationContractDataRules::submit());
        $files = $validated['files'];
        unset($validated['files']);

        $updated = $this->contractDataService->submit(
            $request->user(),
            $reservation,
            $validated,
            $files,
        );

        $prefix = "/broker/reservations/{$updated->id}/attachments";
        $attachments = array_map(
            fn ($attachment) => $attachment->toApiArray($prefix),
            $this->contractDataService->documentationAttachments($updated),
        );

        return response()->json([
            'status' => $updated->status->value,
            'attachments' => $attachments,
        ], 201);
    }
}
