<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Services\ContractIssueService;
use App\Services\ContractSignatureService;
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
        private readonly ContractSignatureService $signatures,
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

    public function review(Reservation $reservation): JsonResponse
    {
        $this->authorize('reviewContract', $reservation);

        return response()->json($this->issueService->review($reservation));
    }

    public function updateReview(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('reviewContract', $reservation);

        $data = $request->validate([
            'template_id' => ['sometimes', 'integer', 'exists:contract_templates,id'],
            'body' => ['sometimes', 'string'],
        ]);

        if (array_key_exists('template_id', $data)) {
            return response()->json($this->issueService->useTemplate($reservation, (int) $data['template_id']));
        }

        return response()->json($this->issueService->saveDraft($reservation, (string) ($data['body'] ?? '')));
    }

    public function accept(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('reviewContract', $reservation);

        return response()->json($this->issueService->accept($request->user(), $reservation), 201);
    }

    public function resendSignatureLinks(Request $request, Reservation $reservation): JsonResponse
    {
        $this->authorize('issueContract', $reservation);
        $data = $request->validate([
            'signer_key' => ['sometimes', 'string', 'max:40'],
        ]);

        return response()->json([
            'notified' => $this->signatures->resendPendingLinks($reservation, $data['signer_key'] ?? null),
        ]);
    }
}
