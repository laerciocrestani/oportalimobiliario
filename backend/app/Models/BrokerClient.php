<?php

namespace App\Models;

use Database\Factories\BrokerClientFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'broker_id',
    'name',
    'phone',
    'email',
])]
class BrokerClient extends Model
{
    /** @use HasFactory<BrokerClientFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $hidden = [
        'name_search',
    ];

    protected static function booted(): void
    {
        static::saving(function (BrokerClient $client): void {
            $client->name_search = self::foldName($client->name);
        });
    }

    public function broker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'broker_id');
    }

    /** @return HasMany<Reservation, $this> */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'client_id');
    }

    /**
     * Case- and accent-insensitive name contains match.
     *
     * @param  Builder<BrokerClient>  $query
     * @return Builder<BrokerClient>
     */
    public function scopeMatchingName(Builder $query, string $term): Builder
    {
        $needle = '%'.self::escapeLike(self::foldName($term)).'%';

        return $query->whereRaw('name_search like ? escape ?', [$needle, '\\']);
    }

    public static function foldName(string $name): string
    {
        return mb_strtolower(Str::ascii($name));
    }

    private static function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }
}
