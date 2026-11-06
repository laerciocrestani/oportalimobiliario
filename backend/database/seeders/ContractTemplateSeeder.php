<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Support\PurchaseSaleContractTemplate;
use Illuminate\Database\Seeder;

class ContractTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $alpha = Tenant::query()->where('slug', 'construtora-alpha')->first();

        if ($alpha === null) {
            return;
        }

        PurchaseSaleContractTemplate::sync($alpha->id);
    }
}
