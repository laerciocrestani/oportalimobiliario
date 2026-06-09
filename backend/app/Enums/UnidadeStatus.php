<?php

namespace App\Enums;

enum UnidadeStatus: string
{
    case Disponivel = 'disponivel';
    case Reservada = 'reservada';
    case Vendida = 'vendida';
}
