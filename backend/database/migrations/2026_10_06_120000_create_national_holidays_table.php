<?php

use App\Support\BrazilianNationalHolidays;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('national_holidays', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->string('name');
        });

        BrazilianNationalHolidays::sync(2026, 2032);
    }

    public function down(): void
    {
        Schema::dropIfExists('national_holidays');
    }
};
