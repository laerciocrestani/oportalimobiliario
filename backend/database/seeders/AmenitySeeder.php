<?php

namespace Database\Seeders;

use App\Models\Amenity;
use Illuminate\Database\Seeder;

class AmenitySeeder extends Seeder
{
    /**
     * @return list<array{slug: string, name: string}>
     */
    public static function definitions(): array
    {
        return [
            ['slug' => 'agua-quente', 'name' => 'Água quente'],
            ['slug' => 'rebaixo-em-gesso', 'name' => 'Rebaixo em gesso'],
            ['slug' => 'sacada-fechada', 'name' => 'Sacada fechada'],
            ['slug' => 'aquecimento-solar', 'name' => 'Aquecimento solar'],
            ['slug' => 'gas-encanado', 'name' => 'Gás encanado'],
            ['slug' => 'ar-condicionado', 'name' => 'Ar-condicionado'],
            ['slug' => 'closet', 'name' => 'Closet'],
            ['slug' => 'piscina', 'name' => 'Piscina'],
            ['slug' => 'academia', 'name' => 'Academia'],
            ['slug' => 'gerador', 'name' => 'Gerador'],
        ];
    }

    public function run(): void
    {
        foreach (self::definitions() as $definition) {
            Amenity::query()->firstOrCreate(
                ['slug' => $definition['slug']],
                ['name' => $definition['name'], 'active' => true],
            );
        }
    }
}
