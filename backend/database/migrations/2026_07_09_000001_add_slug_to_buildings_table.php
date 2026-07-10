<?php

use App\Models\Building;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
        });

        Building::query()->each(function (Building $building): void {
            $building->update([
                'slug' => $this->generateUniqueSlug($building->name, $building->id),
            ]);
        });

        Schema::table('buildings', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->unique()->change();
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }

    private function generateUniqueSlug(string $name, int $ignoreId): string
    {
        $base = Str::slug($name);
        $base = $base !== '' ? $base : 'empreendimento';
        $slug = $base;
        $suffix = 2;

        while (
            Building::query()
                ->where('slug', $slug)
                ->where('id', '!=', $ignoreId)
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
};
