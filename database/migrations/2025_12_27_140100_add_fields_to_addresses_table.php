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
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('civic_number')->nullable()->after('territory_id');
            $table->string('unit')->nullable()->after('civic_number');
            $table->string('contact_name')->nullable()->after('label');
            $table->string('phone')->nullable()->after('contact_name');
            $table->text('notes')->nullable()->after('phone');
            $table->timestamp('next_visit_at')->nullable()->after('last_visit_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn([
                'civic_number',
                'unit',
                'contact_name',
                'phone',
                'notes',
                'next_visit_at',
            ]);
        });
    }
};
