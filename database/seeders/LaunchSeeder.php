<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Assignment;
use App\Models\Organization;
use App\Models\OrganizationOption;
use App\Models\Territory;
use App\Models\TerritoryStreet;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

class LaunchSeeder extends Seeder
{
    /**
     * Seed a demo organization with sample data.
     */
    public function run(): void
    {
        $organization = Organization::firstOrCreate(
            ['slug' => 'default-organization'],
            ['name' => 'Default Organization', 'timezone' => 'America/Montreal'],
        );

        OrganizationOption::seedDefaults($organization->id);

        $admin = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'organization_id' => $organization->id,
                'name' => 'Test User',
                'password' => 'password',
                'email_verified_at' => now(),
                'role' => 'admin',
            ],
        );

        $members = collect([
            $admin,
            User::firstOrCreate(
                ['email' => 'member1@example.com'],
                [
                    'organization_id' => $organization->id,
                    'name' => 'Alex Martin',
                    'password' => 'password',
                    'email_verified_at' => now(),
                    'role' => 'member',
                ],
            ),
            User::firstOrCreate(
                ['email' => 'member2@example.com'],
                [
                    'organization_id' => $organization->id,
                    'name' => 'Jamie Lee',
                    'password' => 'password',
                    'email_verified_at' => now(),
                    'role' => 'member',
                ],
            ),
            User::firstOrCreate(
                ['email' => 'member3@example.com'],
                [
                    'organization_id' => $organization->id,
                    'name' => 'Taylor Brooks',
                    'password' => 'password',
                    'email_verified_at' => now(),
                    'role' => 'member',
                ],
            ),
        ]);

        if (Territory::where('organization_id', $organization->id)->exists()) {
            return;
        }

        $addressStatuses = OrganizationOption::query()
            ->where('organization_id', $organization->id)
            ->where('list_key', 'address_status')
            ->pluck('value')
            ->all();
        $visitResults = OrganizationOption::query()
            ->where('organization_id', $organization->id)
            ->where('list_key', 'visit_result')
            ->pluck('value')
            ->all();
        $visitActions = OrganizationOption::query()
            ->where('organization_id', $organization->id)
            ->where('list_key', 'visit_action')
            ->pluck('value')
            ->all();

        if (!$addressStatuses) {
            $addressStatuses = ['not_visited', 'contact', 'no_answer'];
        }
        if (!$visitResults) {
            $visitResults = ['no_answer', 'contact'];
        }
        if (!$visitActions) {
            $visitActions = ['none', 'follow_up'];
        }

        $territorySeeds = [
            [
                'code' => 'T-101',
                'name' => 'North Ridge',
                'territory_type' => 'Urban',
                'dominant_language' => 'French',
            ],
            [
                'code' => 'T-102',
                'name' => 'East Market',
                'territory_type' => 'Suburban',
                'dominant_language' => 'English',
            ],
            [
                'code' => 'T-103',
                'name' => 'Lakeside',
                'territory_type' => 'Residential',
                'dominant_language' => 'French',
            ],
            [
                'code' => 'T-104',
                'name' => 'Old Town',
                'territory_type' => 'Urban',
                'dominant_language' => 'English',
            ],
        ];

        $streetSets = [
            ['Maple Street', 'Oak Street', 'Pine Street'],
            ['River Road', 'Hillcrest Road', 'Lakeview Drive'],
            ['First Avenue', 'Second Avenue', 'Third Avenue'],
            ['Park Street', 'Garden Street', 'Cedar Lane'],
        ];

        $baseLat = 45.5019;
        $baseLng = -73.5674;
        $offsets = [
            ['lat' => 0.0, 'lng' => 0.0],
            ['lat' => 0.03, 'lng' => -0.02],
            ['lat' => -0.02, 'lng' => 0.03],
            ['lat' => -0.03, 'lng' => -0.03],
        ];

        foreach ($territorySeeds as $index => $seed) {
            $territory = Territory::create([
                'organization_id' => $organization->id,
                'code' => $seed['code'],
                'name' => $seed['name'],
                'territory_type' => $seed['territory_type'],
                'dominant_language' => $seed['dominant_language'],
                'notes' => 'Sample territory seeded for demo purposes.',
            ]);

            $centerLat = $baseLat + ($offsets[$index]['lat'] ?? 0.0);
            $centerLng = $baseLng + ($offsets[$index]['lng'] ?? 0.0);

            $streetNames = $streetSets[$index % count($streetSets)];

            foreach ($streetNames as $streetIndex => $streetName) {
                $streetOffsetLat = 0.004 * ($streetIndex + 1);
                $streetOffsetLng = -0.003 * ($streetIndex + 1);
                $startLat = $centerLat + $streetOffsetLat;
                $startLng = $centerLng + $streetOffsetLng;
                $endLat = $startLat + 0.006;
                $endLng = $startLng + 0.004;

                $geojson = [
                    'type' => 'FeatureCollection',
                    'features' => [
                        [
                            'type' => 'Feature',
                            'properties' => [
                                'name' => $streetName,
                            ],
                            'geometry' => [
                                'type' => 'LineString',
                                'coordinates' => [
                                    [$startLng, $startLat],
                                    [$endLng, $endLat],
                                ],
                            ],
                        ],
                    ],
                ];

                TerritoryStreet::updateOrCreate(
                    [
                        'territory_id' => $territory->id,
                        'name_normalized' => $this->normalizeStreetName($streetName),
                    ],
                    [
                        'name' => $streetName,
                        'geojson' => $geojson,
                        'source' => 'seed',
                    ],
                );

                $addressCount = 8;
                for ($i = 0; $i < $addressCount; $i++) {
                    $ratio = ($i + 1) / ($addressCount + 1);
                    $lat = $startLat + ($endLat - $startLat) * $ratio;
                    $lng = $startLng + ($endLng - $startLng) * $ratio;
                    $status = Arr::random($addressStatuses);
                    $doNotCall = $status === 'do_not_call';
                    $civicNumber = (string) (100 + ($i * 2));

                    $address = Address::create([
                        'organization_id' => $organization->id,
                        'territory_id' => $territory->id,
                        'civic_number' => $civicNumber,
                        'street' => $streetName,
                        'label' => $civicNumber . ' ' . $streetName,
                        'city' => 'Montreal',
                        'region' => 'QC',
                        'country' => 'Canada',
                        'lat' => round($lat, 7),
                        'lng' => round($lng, 7),
                        'status' => $status,
                        'do_not_call' => $doNotCall,
                    ]);

                    $visitCount = $i % 3 === 0 ? 2 : ($i % 4 === 0 ? 1 : 0);
                    $lastVisit = null;

                    for ($v = 0; $v < $visitCount; $v++) {
                        $visitedAt = now()
                            ->subDays(5 + ($i * 2) + ($v * 7))
                            ->subHours(2);
                        $result = Arr::random($visitResults);
                        $action = Arr::random($visitActions);
                        $visitDoNotCall = $result === 'do_not_call' || $action === 'do_not_call';

                        Visit::create([
                            'organization_id' => $organization->id,
                            'address_id' => $address->id,
                            'user_id' => $members->random()->id,
                            'visited_at' => $visitedAt,
                            'result' => $result,
                            'action' => $action === 'none' ? null : $action,
                            'notes' => $v === 0 ? 'Initial visit logged.' : 'Follow-up visit logged.',
                            'do_not_call' => $visitDoNotCall,
                        ]);

                        if ($lastVisit === null || $visitedAt->gt($lastVisit)) {
                            $lastVisit = $visitedAt;
                        }
                    }

                    if ($lastVisit) {
                        $address->last_visit_at = $lastVisit;
                        if ($status === 'return_requested') {
                            $address->next_visit_at = now()->addDays(14);
                        }
                        $address->save();
                    }
                }
            }

            $assignmentStatus = $index % 3 === 2 ? 'returned' : 'active';
            $startAt = now()->subDays(21 - ($index * 3));
            $dueAt = $assignmentStatus === 'returned'
                ? now()->subDays(7 - $index)
                : now()->addDays(10 - ($index * 2));
            $returnedAt = $assignmentStatus === 'returned'
                ? $dueAt->copy()->addDays(2)
                : null;

            Assignment::create([
                'organization_id' => $organization->id,
                'territory_id' => $territory->id,
                'assignee_user_id' => $members->random()->id,
                'start_at' => $startAt,
                'due_at' => $dueAt,
                'returned_at' => $returnedAt,
                'status' => $assignmentStatus,
                'notes' => $assignmentStatus === 'returned'
                    ? 'Returned and ready for reassignment.'
                    : 'Sample active assignment.',
            ]);
        }
    }

    private function normalizeStreetName(string $value): string
    {
        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/[^a-z0-9]+/', ' ', $normalized) ?? '';
        return trim($normalized);
    }
}
