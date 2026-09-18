<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\ProposalTemplate;
use App\Support\ContractSystemVariables;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-RPF-010
 */
class ProposalTemplateController extends Controller
{
    public function variables(): JsonResponse
    {
        $this->authorize('viewAny', ProposalTemplate::class);

        return response()->json(ContractSystemVariables::catalog());
    }

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ProposalTemplate::class);

        $templates = ProposalTemplate::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ProposalTemplate $template) => $template->toApiArray())
            ->values();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ProposalTemplate::class);

        $data = $this->validated($request);

        $template = ProposalTemplate::query()->create($data);

        return response()->json($template->toApiArray(), 201);
    }

    public function update(Request $request, ProposalTemplate $proposalTemplate): JsonResponse
    {
        $this->authorize('update', $proposalTemplate);

        $data = $this->validated($request, $proposalTemplate);

        $proposalTemplate->update($data);

        return response()->json($proposalTemplate->fresh()->toApiArray());
    }

    public function destroy(ProposalTemplate $proposalTemplate): JsonResponse
    {
        $this->authorize('delete', $proposalTemplate);

        $proposalTemplate->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?ProposalTemplate $template = null): array
    {
        $uniqueName = Rule::unique('proposal_templates', 'name')
            ->where('tenant_id', $request->user()->tenant_id);

        if ($template !== null) {
            $uniqueName->ignore($template->id);
        }

        $rules = [
            'name' => [$template === null ? 'required' : 'sometimes', 'string', 'max:255', $uniqueName],
            'body_markdown' => [$template === null ? 'required' : 'sometimes', 'string'],
            'custom_variables' => ['sometimes', 'array'],
            'custom_variables.*.slug' => ['required', 'string', 'max:80', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct'],
            'custom_variables.*.label' => ['required', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ];

        $data = $request->validate($rules);

        if (array_key_exists('custom_variables', $data)) {
            $data['custom_variables'] = array_values($data['custom_variables']);
        }

        return $data;
    }
}
