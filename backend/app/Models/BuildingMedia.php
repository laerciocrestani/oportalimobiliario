<?php

namespace App\Models;

use App\Enums\BuildingMediaCategory;
use Database\Factories\BuildingMediaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'building_id',
    'category',
    'path',
    'original_name',
    'mime_type',
    'size_bytes',
    'published',
    'sort_order',
])]
class BuildingMedia extends Model
{
    /** @use HasFactory<BuildingMediaFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (BuildingMedia $media): void {
            if ($media->category === BuildingMediaCategory::FloorPlan) {
                $media->published = false;
            }
        });
    }

    protected function casts(): array
    {
        return [
            'category' => BuildingMediaCategory::class,
            'published' => 'boolean',
            'size_bytes' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(string $fileUrlPrefix): array
    {
        return [
            'id' => $this->id,
            'building_id' => $this->building_id,
            'category' => $this->category->value,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'published' => $this->published,
            'sort_order' => $this->sort_order,
            'url' => "{$fileUrlPrefix}/{$this->id}/file",
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
