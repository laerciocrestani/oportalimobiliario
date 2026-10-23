<?php

namespace App\Http\Controllers\Api\Broker;

use App\Enums\PartyKind;
use App\Http\Controllers\Controller;
use App\Models\ReservationProposal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BuyerLookupController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document' => ['required', 'string', 'max:18'],
        ]);

        $digits = preg_replace('/\D+/', '', $data['document']) ?? '';

        if (! in_array(strlen($digits), [11, 14], true)) {
            throw ValidationException::withMessages([
                'document' => 'Informe um CPF ou CNPJ válido.',
            ]);
        }

        $proposal = ReservationProposal::query()
            ->where('client_cpf', $digits)
            ->whereHas('reservation', function ($query) use ($request): void {
                $query->where('broker_id', $request->user()->id);
            })
            ->latest('id')
            ->first();

        if ($proposal === null) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json([
            'party_kind' => $proposal->party_kind?->value ?? PartyKind::Individual->value,
            'client_name' => $proposal->client_name,
            'client_phone' => $proposal->client_phone,
            'client_email' => $proposal->client_email,
            'client_cpf' => $proposal->client_cpf,
            'client_rg' => $proposal->client_rg,
            'address' => $proposal->address,
            'city' => $proposal->city,
            'state' => $proposal->state,
            'zip' => $proposal->zip,
            'marital_status' => $proposal->marital_status,
            'nationality' => $proposal->nationality,
            'profession' => $proposal->profession,
            'spouse_name' => $proposal->spouse_name,
            'spouse_cpf' => $proposal->spouse_cpf,
        ]);
    }
}
