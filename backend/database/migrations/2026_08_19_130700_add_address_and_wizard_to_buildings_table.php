<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->string('zip', 8)->nullable()->after('name');
            $table->string('street')->nullable()->after('zip');
            $table->string('number', 30)->nullable()->after('street');
            $table->string('complement')->nullable()->after('number');
            $table->string('neighborhood')->nullable()->after('complement');
            $table->unsignedTinyInteger('wizard_step')->default(1)->after('published');
            $table->timestamp('wizard_completed_at')->nullable()->after('wizard_step');
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            $table->dropColumn([
                'zip',
                'street',
                'number',
                'complement',
                'neighborhood',
                'wizard_step',
                'wizard_completed_at',
            ]);
        });
    }
};
