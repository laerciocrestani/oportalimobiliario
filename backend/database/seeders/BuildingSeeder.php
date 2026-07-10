<?php

namespace Database\Seeders;

use App\Models\Building;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class BuildingSeeder extends Seeder
{
    /**
     * @return array<int, array{tenant_slug: string, slug: string, name: string, description: string, city: string, state: string, published: bool, seo_title?: string, seo_description?: string}>
     */
    public static function definitions(): array
    {
        return [
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'residencial-aurora',
                'name' => 'Residencial Aurora',
                'description' => 'Lançamento de alto padrão com lazer completo e unidades de 2 e 3 dormitórios.',
                'city' => 'São Paulo',
                'state' => 'SP',
                'published' => true,
                'seo_title' => 'Residencial Aurora — Lançamento SP',
                'seo_description' => 'Conheça o Residencial Aurora, lançamento exclusivo em São Paulo.',
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'edificio-horizonte',
                'name' => 'Edifício Horizonte',
                'description' => 'Empreendimento em fase de aprovação comercial, ainda não publicado.',
                'city' => 'Campinas',
                'state' => 'SP',
                'published' => false,
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'residencial-parque-das-flores',
                'name' => 'Residencial Parque das Flores',
                'description' => 'Condomínio fechado com área verde e unidades garden.',
                'city' => 'Curitiba',
                'state' => 'PR',
                'published' => true,
                'seo_title' => 'Parque das Flores — Curitiba',
                'seo_description' => 'Unidades garden e coberturas em bairro consolidado.',
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'torre-vista-mar',
                'name' => 'Torre Vista Mar',
                'description' => 'Torre frente mar com plantas amplas e vista permanente.',
                'city' => 'Santos',
                'state' => 'SP',
                'published' => true,
                'seo_title' => 'Torre Vista Mar — Santos',
                'seo_description' => 'Apartamentos com vista para a orla de Santos.',
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'condominio-jardim-europa',
                'name' => 'Condomínio Jardim Europa',
                'description' => 'Projeto compacto no coração da Zona Sul carioca.',
                'city' => 'Rio de Janeiro',
                'state' => 'RJ',
                'published' => true,
                'seo_title' => 'Jardim Europa — Rio de Janeiro',
                'seo_description' => 'Studios e 2 quartos próximos ao metrô.',
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'residencial-central-park',
                'name' => 'Residencial Central Park',
                'description' => 'Empreendimento vertical com coworking e rooftop.',
                'city' => 'Belo Horizonte',
                'state' => 'MG',
                'published' => true,
                'seo_title' => 'Central Park — Belo Horizonte',
                'seo_description' => 'Lançamento com rooftop e área de coworking.',
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'edificio-montanha-verde',
                'name' => 'Edifício Montanha Verde',
                'description' => 'Rascunho interno para validação de plantas e precificação.',
                'city' => 'Florianópolis',
                'state' => 'SC',
                'published' => false,
            ],
            [
                'tenant_slug' => 'construtora-alpha',
                'slug' => 'residencial-bela-vista',
                'name' => 'Residencial Bela Vista',
                'description' => 'Mix de unidades compactas e familiares em região em expansão.',
                'city' => 'Porto Alegre',
                'state' => 'RS',
                'published' => true,
                'seo_title' => 'Bela Vista — Porto Alegre',
                'seo_description' => 'Lançamento com opções de 1 a 3 dormitórios.',
            ],
            [
                'tenant_slug' => 'construtora-beta',
                'slug' => 'residencial-beta-norte',
                'name' => 'Residencial Beta Norte',
                'description' => 'Primeiro lançamento da Construtora Beta no mercado local.',
                'city' => 'Goiânia',
                'state' => 'GO',
                'published' => true,
                'seo_title' => 'Beta Norte — Goiânia',
                'seo_description' => 'Empreendimento demo da Construtora Beta.',
            ],
            [
                'tenant_slug' => 'construtora-beta',
                'slug' => 'residencial-beta-sul',
                'name' => 'Residencial Beta Sul',
                'description' => 'Segundo empreendimento Beta ainda em preparação comercial.',
                'city' => 'Brasília',
                'state' => 'DF',
                'published' => false,
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::definitions() as $definition) {
            $tenant = Tenant::query()->where('slug', $definition['tenant_slug'])->first();

            if ($tenant === null) {
                continue;
            }

            Building::query()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => $definition['slug']],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'city' => $definition['city'],
                    'state' => $definition['state'],
                    'published' => $definition['published'],
                    'seo_title' => $definition['seo_title'] ?? null,
                    'seo_description' => $definition['seo_description'] ?? null,
                ],
            );
        }
    }
}
