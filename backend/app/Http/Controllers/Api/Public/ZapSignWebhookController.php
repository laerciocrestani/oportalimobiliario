<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Services\ProposalSignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @see REQ-RDP-006
 */
class ZapSignWebhookController extends Controller
{
    public function __construct(private readonly ProposalSignatureService $signatures) {}

    public function handle(Request $request): JsonResponse
    {
        $expected = (string) config('services.zapsign.webhook_token');
        $given = $request->header('X-ZapSign-Token');
        $given = is_string($given) ? $given : '';

        if ($expected === '' || ! hash_equals($expected, $given)) {
            abort(401);
        }

        $this->signatures->applyWebhook($request->all());

        return response()->json(['ok' => true]);
    }
}
