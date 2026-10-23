<?php

namespace App\Http\Controllers\Api\Broker;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\ProposalIssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationProposalTemplateController extends Controller
{
    public function __construct(
        private readonly ProposalIssueService $issueService,
    ) {}

    public function index(Request $request, Reservation $reservation): JsonResponse
    {
        if ($reservation->broker_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($this->issueService->listForBroker($reservation));
    }
}
