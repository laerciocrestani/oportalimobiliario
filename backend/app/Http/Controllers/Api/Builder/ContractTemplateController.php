<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\ContractTemplate;
use App\Support\ContractSystemVariables;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-CTR-003
 * @see REQ-CTR-005
 */
class ContractTemplateController extends Controller
{
    public function variables(): JsonResponse
    {
        $this->authorize('viewAny', ContractTemplate::class);

        return response()->json(ContractSystemVariables::catalog());
    }

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ContractTemplate::class);

        $templates = ContractTemplate::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ContractTemplate $template) => $template->toApiArray())
            ->values();

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ContractTemplate::class);

        $data = $this->validated($request);

        $template = ContractTemplate::query()->create($data);

        return response()->json($template->toApiArray(), 201);
    }

    public function update(Request $request, ContractTemplate $contractTemplate): JsonResponse
    {
        $this->authorize('update', $contractTemplate);

        $data = $this->validated($request, $contractTemplate);

        $contractTemplate->update($data);

        return response()->json($contractTemplate->fresh()->toApiArray());
    }

    public function destroy(ContractTemplate $contractTemplate): JsonResponse
    {
        $this->authorize('delete', $contractTemplate);

        $contractTemplate->delete();

        return response()->json(null, 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?ContractTemplate $template = null): array
    {
        $uniqueName = Rule::unique('contract_templates', 'name')
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
