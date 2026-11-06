<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Services\BrokerBuildingRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrokerAccountController extends Controller
{
    public function __construct(private BrokerBuildingRequestService $requests) {}

    public function store(Request $request, Building $building): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'name.required' => 'Informe seu nome.',
            'phone.required' => 'Informe seu telefone.',
            'email.required' => 'Informe seu e-mail.',
            'email.email' => 'Informe um e-mail válido.',
            'password.required' => 'Informe uma senha.',
            'password.min' => 'A senha deve ter pelo menos 8 caracteres.',
            'password.confirmed' => 'As senhas não coincidem.',
        ]);

        $result = $this->requests->register(
            $building,
            $data['name'],
            $data['phone'],
            $data['email'],
            $data['password'],
        );

        return response()->json($result, 201);
    }
}
