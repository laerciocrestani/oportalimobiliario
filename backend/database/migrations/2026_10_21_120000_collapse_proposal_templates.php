<?php

use App\Support\CommercialProposalTemplate;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('tenants')->pluck('id') as $tenantId) {
            CommercialProposalTemplate::sync((int) $tenantId);
        }
    }

    public function down(): void
    {
        // Modelos customizados removidos não são restaurados.
    }
};
