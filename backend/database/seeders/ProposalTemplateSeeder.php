<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Support\CommercialProposalTemplate;
use Illuminate\Database\Seeder;

class ProposalTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();

        if ($alpha === null) {
            return;
        }

        CommercialProposalTemplate::sync($alpha->id);
    }
}
