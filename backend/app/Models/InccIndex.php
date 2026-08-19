<?php

namespace App\Models;

use App\Enums\InccIndexSource;
use Database\Factories\InccIndexFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'competence',
    'value',
    'source',
    'fetched_at',
])]
class InccIndex extends Model
{
    /** @use HasFactory<InccIndexFactory> */
    use HasFactory;

    protected $attributes = [
        'source' => 'manual',
    ];

    protected function casts(): array
    {
        return [
            'competence' => 'date:Y-m-d',
            'value' => 'decimal:6',
            'source' => InccIndexSource::class,
            'fetched_at' => 'datetime',
        ];
    }
}
