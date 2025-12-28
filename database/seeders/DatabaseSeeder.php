<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\OrganizationOption;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $organization = Organization::firstOrCreate(
            ['slug' => 'default-organization'],
            ['name' => 'Default Organization']
        );

        OrganizationOption::seedDefaults($organization->id);

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'organization_id' => $organization->id,
                'name' => 'Test User',
                'password' => 'password',
                'email_verified_at' => now(),
                'role' => 'admin',
            ]
        );

        $this->call(LaunchSeeder::class);
    }
}
