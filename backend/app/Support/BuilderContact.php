<?php

namespace App\Support;

use App\Models\Building;
use App\Models\User;

class BuilderContact
{
    /**
     * Contato público da construtora.
     *
     * O nome é o do tenant. E-mail e telefone vêm do usuário builder mais antigo,
     * a conta da construtora, e não de um comercial ou supervisor criado depois.
     *
     * @return array{name: string, email: string|null, phone: string|null}|null
     */
    public static function for(Building $building): ?array
    {
        $tenant = $building->tenant;

        if ($tenant === null) {
            return null;
        }

        /** @var User|null $contact */
        $contact = $tenant->builderUsers->first();

        return [
            'name' => $tenant->name,
            'email' => $contact?->email,
            'phone' => $contact?->phone,
        ];
    }
}
