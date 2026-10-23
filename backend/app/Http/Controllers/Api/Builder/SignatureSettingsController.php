<?php

namespace App\Http\Controllers\Api\Builder;

use App\Enums\SignatureWitnessKind;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SignatureSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @see REQ-RDP-008
 */
class SignatureSettingsController extends Controller
{
    public function __construct(
        private readonly SignatureSettingsService $settingsService,
    ) {}

    public function show(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        return response()->json($this->settingsService->show());
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $data = $request->validate([
            'proposal_signer_user_id' => ['required', 'integer'],
            'witness_slots' => ['required', 'array', 'min:1', 'max:10'],
            'witness_slots.*.kind' => ['required', Rule::enum(SignatureWitnessKind::class)],
            'witness_slots.*.user_id' => ['nullable', 'integer'],
        ]);

        $updated = $this->settingsService->save(
            $request->user(),
            (int) $data['proposal_signer_user_id'],
            $data['witness_slots'],
        );

        return response()->json($updated);
    }
}
