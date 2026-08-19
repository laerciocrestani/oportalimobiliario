<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Services\ContractIssueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-CTR-008
 * @see REQ-CTR-009
 * @see REQ-CTR-010
 */
class ContractIssueController extends Controller
{
    public function __construct(
        private readonly ContractIssueService $issueService,
    ) {}

    public function templates(Reservation $reservation): JsonResponse
    {
        $this->authorize('issueContract', $reservation);

        return response()->json($this->issueService->activeTemplates($reservation));
    }

    public function preview(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('issueContract', $reservation);

        $data = $request->validate([
            'template_id' => ['required', 'integer', 'exists:contract_templates,id'],
        ]);

        $template = ContractTemplate::query()->findOrFail($data['template_id']);

        return response()->json($this->issueService->preview($reservation, $template));
    }

    public function store(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('issueContract', $reservation);

        $data = $request->validate([
            'contract_template_id' => ['required', 'integer', 'exists:contract_templates,id'],
            'values' => ['present', 'array'],
            'values.*' => ['nullable', 'string'],
            'final_price_brl' => ['required', 'numeric', 'min:0'],
        ]);

        $template = ContractTemplate::query()->findOrFail($data['contract_template_id']);

        $result = $this->issueService->issue(
            $request->user(),
            $reservation,
            $template,
            $data['values'] ?? [],
            (string) $data['final_price_brl'],
        );

        return response()->json($result, 201);
    }
}
