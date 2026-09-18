<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\ProposalTemplate;
use App\Models\Reservation;
use App\Services\ProposalIssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RPF-011
 */
class ProposalIssueController extends Controller
{
    public function __construct(
        private readonly ProposalIssueService $issueService,
    ) {}

    public function templates(Reservation $reservation): JsonResponse
    {
        $this->authorize('issueProposal', $reservation);

        return response()->json($this->issueService->activeTemplates($reservation));
    }

    public function preview(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('issueProposal', $reservation);

        $data = $request->validate([
            'template_id' => ['required', 'integer', 'exists:proposal_templates,id'],
        ]);

        $template = ProposalTemplate::query()->findOrFail($data['template_id']);

        return response()->json($this->issueService->preview($reservation, $template));
    }

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('issueProposal', $reservation);

        $data = $request->validate([
            'proposal_template_id' => ['required', 'integer', 'exists:proposal_templates,id'],
            'values' => ['present', 'array'],
            'values.*' => ['nullable', 'string'],
            'final_price_brl' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        $template = ProposalTemplate::query()->findOrFail($data['proposal_template_id']);

        $result = $this->issueService->issue(
            $request->user(),
            $reservation,
            $template,
            $data['values'] ?? [],
            isset($data['final_price_brl']) ? (string) $data['final_price_brl'] : null,
        );

        return response()->json($result, 201);
    }
}
