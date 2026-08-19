<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Services\ViaCepClient;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * @see REQ-WIZ-002
 */
class CepController extends Controller
{
    public function show(string $cep, ViaCepClient $viaCep): JsonResponse
    {
        $digits = preg_replace('/\D/', '', $cep) ?? '';

        if (strlen($digits) !== 8) {
            return response()->json([
                'message' => 'Informe um CEP com 8 dígitos.',
            ], 422);
        }

        try {
            $address = $viaCep->lookup($digits);
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
            ], 503);
        }

        if ($address === null) {
            return response()->json([
                'message' => 'CEP não encontrado. Preencha o endereço manualmente.',
            ], 404);
        }

        return response()->json($address);
    }
}
