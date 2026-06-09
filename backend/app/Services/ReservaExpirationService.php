<?php

namespace App\Services;

use App\Enums\UnidadeStatus;
use App\Models\Reserva;
use App\Models\Unidade;
use Illuminate\Support\Facades\DB;

/**
 * @see REQ-RES-002
 */
class ReservaExpirationService
{
    public function expireDueReservas(): int
    {
        $expired = Reserva::query()
            ->withoutGlobalScope('tenant')
            ->where('expires_at', '<=', now())
            ->get();

        $count = 0;

        foreach ($expired as $reserva) {
            DB::transaction(function () use ($reserva, &$count) {
                $unidade = Unidade::query()
                    ->withoutGlobalScope('tenant')
                    ->lockForUpdate()
                    ->find($reserva->unidade_id);

                if ($unidade !== null && $unidade->status === UnidadeStatus::Reservada) {
                    $unidade->update(['status' => UnidadeStatus::Disponivel]);
                }

                $reserva->delete();
                $count++;
            });
        }

        return $count;
    }
}
