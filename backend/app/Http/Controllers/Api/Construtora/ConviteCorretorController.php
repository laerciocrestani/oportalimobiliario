<?php

namespace App\Http\Controllers\Api\Construtora;

use App\Http\Controllers\Controller;
use App\Models\AcessoUnidade;
use App\Models\ConviteCorretor;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * @see REQ-CONV-001
 */
class ConviteCorretorController extends Controller
{
    public function index(): JsonResponse
    {
        $convites = ConviteCorretor::query()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($convites);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $convite = ConviteCorretor::query()->create([
            'created_by' => $request->user()->id,
            'email' => $data['email'],
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json($convite, 201);
    }
}
