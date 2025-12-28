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
        Schema::create('territories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('territories')->nullOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('territory_type')->nullable();
            $table->string('dominant_language')->nullable();
            $table->text('notes')->nullable();
            $table->string('map_image_path')->nullable();
            $table->unsignedInteger('map_image_width')->nullable();
            $table->unsignedInteger('map_image_height')->nullable();
            $table->json('overlay_corners')->nullable();
            $table->json('boundary_geojson')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
            $table->index(['organization_id', 'parent_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('territories');
    }
};
