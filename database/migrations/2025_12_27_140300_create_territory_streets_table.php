<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('territory_streets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('territory_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('name_normalized');
            $table->json('geojson')->nullable();
            $table->string('source')->nullable();
            $table->timestamps();

            $table->unique(['territory_id', 'name_normalized']);
            $table->index(['territory_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('territory_streets');
    }
};
