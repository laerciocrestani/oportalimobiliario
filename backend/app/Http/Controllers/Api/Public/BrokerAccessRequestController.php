<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Mail\BrokerAccessRequestMail;
use App\Models\BrokerAccessRequest;
use App\Models\Building;
use App\Support\BuilderContact;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class BrokerAccessRequestController extends Controller
{
    private const SENT_MESSAGE = 'Pedido enviado para a construtora.';

    public function __construct(private PhoneNumberNormalizer $phones) {}

    public function store(Request $request, Building $building): JsonResponse
    {
        if (! $building->published) {
            abort(404);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ], [
            'name.required' => 'Informe seu nome.',
            'name.max' => 'O nome pode ter no máximo 120 caracteres.',
            'phone.required' => 'Informe seu telefone.',
            'phone.max' => 'O telefone pode ter no máximo 30 caracteres.',
            'email.email' => 'Informe um e-mail válido.',
            'email.max' => 'O e-mail pode ter no máximo 255 caracteres.',
        ]);

        $phone = $this->phones->toE164($data['phone']);

        if ($phone === null || ! preg_match('/^\+55\d{10,11}$/', $phone)) {
            throw ValidationException::withMessages([
                'phone' => ['Informe um telefone válido com DDD.'],
            ]);
        }

        $email = isset($data['email']) ? mb_strtolower($data['email']) : null;
        $name = trim($data['name']);
        $record = $this->save($building, $name, $phone, $email);

        if ($record->wasRecentlyCreated) {
            $this->notifyBuilder($building, $record);
        }

        return response()->json([
            'message' => self::SENT_MESSAGE,
        ], $record->wasRecentlyCreated ? 201 : 200);
    }

    private function save(Building $building, string $name, string $phone, ?string $email): BrokerAccessRequest
    {
        $attributes = [
            'tenant_id' => $building->tenant_id,
            'name' => $name,
            'email' => $email,
        ];

        try {
            return BrokerAccessRequest::query()->updateOrCreate(
                [
                    'building_id' => $building->id,
                    'phone' => $phone,
                ],
                $attributes,
            );
        } catch (UniqueConstraintViolationException) {
            $record = BrokerAccessRequest::query()
                ->where('building_id', $building->id)
                ->where('phone', $phone)
                ->firstOrFail();

            $record->update([
                'name' => $name,
                'email' => $email,
            ]);

            return $record;
        }
    }

    private function notifyBuilder(Building $building, BrokerAccessRequest $accessRequest): void
    {
        $building->loadMissing('tenant.builderUsers');
        $email = BuilderContact::for($building)['email'] ?? null;

        if ($email === null || $email === '') {
            return;
        }

        try {
            Mail::to($email)->send(new BrokerAccessRequestMail(
                brokerName: $accessRequest->name,
                phone: $accessRequest->phone,
                email: $accessRequest->email,
                buildingName: $building->name,
            ));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
