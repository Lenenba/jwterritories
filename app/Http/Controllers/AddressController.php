<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\OrganizationOption;
use App\Models\Territory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class AddressController extends Controller
{
    /**
     * Store a newly created address in storage.
     */
    public function store(Request $request, Territory $territory): RedirectResponse
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $validated = $request->validate([
            'civic_number' => ['nullable', 'string', 'max:50'],
            'unit' => ['nullable', 'string', 'max:50'],
            'label' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'street' => ['nullable', 'string', 'max:255'],
            'street2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'status' => ['nullable', 'string', 'max:50'],
            'do_not_call' => ['nullable', 'boolean'],
            'next_visit_at' => ['nullable', 'date'],
        ]);

        $status = $validated['status'] ?? 'not_visited';
        $doNotCall = (bool) ($validated['do_not_call'] ?? false);
        if ($status === 'do_not_call') {
            $doNotCall = true;
        }

        $address = new Address($validated);
        $address->organization_id = $request->user()->organization_id;
        $address->territory_id = $territory->id;
        $address->status = $status;
        $address->do_not_call = $doNotCall;
        $address->next_visit_at = $validated['next_visit_at'] ?? null;

        if ($address->lat === null && $address->lng === null) {
            $coordinates = $this->geocodeAddress($validated);
            if ($coordinates) {
                $address->lat = $coordinates['lat'];
                $address->lng = $coordinates['lng'];
            }
        }

        $address->save();

        return to_route('territories.show', $territory);
    }

    /**
     * Import addresses from OCR text.
     */
    public function importScan(Request $request, Territory $territory): RedirectResponse
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $validated = $request->validate([
            'lines' => ['required', 'string', 'max:50000'],
            'default_city' => ['nullable', 'string', 'max:255'],
            'default_region' => ['nullable', 'string', 'max:255'],
            'default_postal_code' => ['nullable', 'string', 'max:50'],
            'default_country' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $status = $validated['status'] ?? 'not_visited';
        $doNotCall = $status === 'do_not_call';
        $now = now();
        $rows = [];
        $seen = [];

        $lines = preg_split('/\r\n|\r|\n/', $validated['lines']) ?: [];
        foreach ($lines as $line) {
            $normalized = $this->normalizeImportLine($line);
            if ($normalized === '' || isset($seen[$normalized])) {
                continue;
            }
            $seen[$normalized] = true;

            if (!$this->looksLikeAddressLine($normalized)) {
                continue;
            }

            $parsed = $this->parseImportLine($normalized);
            $row = [
                'organization_id' => $request->user()->organization_id,
                'territory_id' => $territory->id,
                'civic_number' => $parsed['civic_number'],
                'street' => $parsed['street'],
                'label' => $parsed['label'],
                'city' => $validated['default_city'] ?? null,
                'region' => $validated['default_region'] ?? null,
                'postal_code' => $validated['default_postal_code'] ?? null,
                'country' => $validated['default_country'] ?? null,
                'status' => $status,
                'do_not_call' => $doNotCall,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            $coordinates = $this->geocodeAddress($row);
            if ($coordinates) {
                $row['lat'] = $coordinates['lat'];
                $row['lng'] = $coordinates['lng'];
            }

            $rows[] = $row;
        }

        if ($rows) {
            Address::insert($rows);
        }

        return to_route('territories.show', $territory);
    }

    /**
     * Store multiple addresses at once.
     */
    public function bulkStore(Request $request, Territory $territory): RedirectResponse
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $validated = $request->validate([
            'addresses' => ['required', 'array', 'min:1', 'max:500'],
            'addresses.*.civic_number' => ['nullable', 'string', 'max:50'],
            'addresses.*.unit' => ['nullable', 'string', 'max:50'],
            'addresses.*.label' => ['nullable', 'string', 'max:255'],
            'addresses.*.contact_name' => ['nullable', 'string', 'max:255'],
            'addresses.*.street' => ['nullable', 'string', 'max:255'],
            'addresses.*.street2' => ['nullable', 'string', 'max:255'],
            'addresses.*.city' => ['nullable', 'string', 'max:255'],
            'addresses.*.region' => ['nullable', 'string', 'max:255'],
            'addresses.*.postal_code' => ['nullable', 'string', 'max:50'],
            'addresses.*.country' => ['nullable', 'string', 'max:255'],
            'addresses.*.phone' => ['nullable', 'string', 'max:50'],
            'addresses.*.notes' => ['nullable', 'string'],
            'addresses.*.lat' => ['nullable', 'numeric', 'between:-90,90'],
            'addresses.*.lng' => ['nullable', 'numeric', 'between:-180,180'],
            'status' => ['nullable', 'string', 'max:50'],
            'do_not_call' => ['nullable', 'boolean'],
        ]);

        $status = $validated['status'] ?? 'not_visited';
        $doNotCall = (bool) ($validated['do_not_call'] ?? false);
        if ($status === 'do_not_call') {
            $doNotCall = true;
        }

        $now = now();
        $rows = collect($validated['addresses'])
            ->map(function ($address) use ($request, $territory, $status, $doNotCall, $now) {
                return [
                    'organization_id' => $request->user()->organization_id,
                    'territory_id' => $territory->id,
                    'civic_number' => $address['civic_number'] ?? null,
                    'unit' => $address['unit'] ?? null,
                    'label' => $address['label'] ?? null,
                    'contact_name' => $address['contact_name'] ?? null,
                    'street' => $address['street'] ?? null,
                    'street2' => $address['street2'] ?? null,
                    'city' => $address['city'] ?? null,
                    'region' => $address['region'] ?? null,
                    'postal_code' => $address['postal_code'] ?? null,
                    'country' => $address['country'] ?? null,
                    'phone' => $address['phone'] ?? null,
                    'notes' => $address['notes'] ?? null,
                    'lat' => $address['lat'] ?? null,
                    'lng' => $address['lng'] ?? null,
                    'status' => $status,
                    'do_not_call' => $doNotCall,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            })
            ->filter(function ($row) {
                return (bool) ($row['street'] ?? null) || (bool) ($row['label'] ?? null);
            })
            ->unique(function ($row) {
                return strtolower(trim(implode('|', [
                    $row['civic_number'] ?? '',
                    $row['street'] ?? '',
                    $row['unit'] ?? '',
                ])));
            })
            ->values()
            ->all();

        if ($rows) {
            Address::insert($rows);
        }

        return to_route('territories.show', $territory);
    }

    /**
     * Show the form for editing the specified address.
     */
    public function edit(Request $request, Address $address): Response
    {
        $this->ensureOrganization($request, $address->organization_id);

        $address->load('territory:id,code,name');

        $organizationId = $request->user()->organization_id;
        $statusOptions = OrganizationOption::query()
            ->where('organization_id', $organizationId)
            ->where('list_key', 'address_status')
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('label')
            ->get(['label', 'value']);

        return Inertia::render('addresses/edit', [
            'address' => [
                'id' => $address->id,
                'civic_number' => $address->civic_number,
                'unit' => $address->unit,
                'label' => $address->label,
                'contact_name' => $address->contact_name,
                'street' => $address->street,
                'street2' => $address->street2,
                'city' => $address->city,
                'region' => $address->region,
                'postal_code' => $address->postal_code,
                'country' => $address->country,
                'phone' => $address->phone,
                'notes' => $address->notes,
                'lat' => $address->lat,
                'lng' => $address->lng,
                'status' => $address->status,
                'do_not_call' => $address->do_not_call,
                'next_visit_at' => $address->next_visit_at,
                'territory' => $address->territory,
            ],
            'statusOptions' => $statusOptions,
        ]);
    }

    /**
     * Update the specified address in storage.
     */
    public function update(Request $request, Address $address): RedirectResponse
    {
        $this->ensureOrganization($request, $address->organization_id);

        $validated = $request->validate([
            'civic_number' => ['nullable', 'string', 'max:50'],
            'unit' => ['nullable', 'string', 'max:50'],
            'label' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'street' => ['nullable', 'string', 'max:255'],
            'street2' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'postal_code' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'status' => ['nullable', 'string', 'max:50'],
            'do_not_call' => ['nullable', 'boolean'],
            'next_visit_at' => ['nullable', 'date'],
        ]);

        $status = $validated['status'] ?? $address->status ?? 'not_visited';
        $doNotCall = (bool) ($validated['do_not_call'] ?? $address->do_not_call);
        if ($status === 'do_not_call') {
            $doNotCall = true;
        }
        if ($doNotCall) {
            $status = 'do_not_call';
        }

        $address->fill($validated);
        $address->status = $status;
        $address->do_not_call = $doNotCall;
        if (array_key_exists('next_visit_at', $validated)) {
            $address->next_visit_at = $validated['next_visit_at'];
        }

        if ($address->lat === null && $address->lng === null) {
            $coordinates = $this->geocodeAddress($address->toArray());
            if ($coordinates) {
                $address->lat = $coordinates['lat'];
                $address->lng = $coordinates['lng'];
            }
        }

        $address->save();

        return to_route('addresses.show', $address);
    }

    /**
     * Display the specified address.
     */
    public function show(Request $request, Address $address): Response
    {
        $this->ensureOrganization($request, $address->organization_id);

        $address->load([
            'territory:id,code,name',
            'visits' => function ($query) {
                $query->latest('visited_at')->with('user:id,name');
            },
        ]);

        $addressData = [
            'id' => $address->id,
            'civic_number' => $address->civic_number,
            'unit' => $address->unit,
            'label' => $address->label,
            'contact_name' => $address->contact_name,
            'street' => $address->street,
            'street2' => $address->street2,
            'city' => $address->city,
            'region' => $address->region,
            'postal_code' => $address->postal_code,
            'country' => $address->country,
            'phone' => $address->phone,
            'notes' => $address->notes,
            'lat' => $address->lat,
            'lng' => $address->lng,
            'status' => $address->status,
            'do_not_call' => $address->do_not_call,
            'last_visit_at' => $address->last_visit_at,
            'next_visit_at' => $address->next_visit_at,
            'territory' => $address->territory,
        ];

        $visits = $address->visits->map(function ($visit) {
            return [
                'id' => $visit->id,
                'visited_at' => $visit->visited_at,
                'result' => $visit->result,
                'action' => $visit->action,
                'openness' => $visit->openness,
                'observed_language' => $visit->observed_language,
                'notes' => $visit->notes,
                'person_name' => $visit->person_name,
                'do_not_call' => $visit->do_not_call,
                'user' => $visit->user,
            ];
        });

        $organizationId = $request->user()->organization_id;
        $resultOptions = OrganizationOption::query()
            ->where('organization_id', $organizationId)
            ->where('list_key', 'visit_result')
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('label')
            ->get(['label', 'value']);

        $actionOptions = OrganizationOption::query()
            ->where('organization_id', $organizationId)
            ->where('list_key', 'visit_action')
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('label')
            ->get(['label', 'value']);

        return Inertia::render('addresses/show', [
            'address' => $addressData,
            'visits' => $visits,
            'resultOptions' => $resultOptions,
            'actionOptions' => $actionOptions,
        ]);
    }

    /**
     * Remove the specified address from storage.
     */
    public function destroy(Request $request, Address $address): RedirectResponse
    {
        $this->ensureOrganization($request, $address->organization_id);

        $territoryId = $address->territory_id;
        $address->delete();

        if ($territoryId) {
            return to_route('territories.show', $territoryId);
        }

        return to_route('territories.index');
    }

    private function normalizeImportLine(string $line): string
    {
        $normalized = preg_replace('/\s+/', ' ', $line);
        return trim($normalized ?? '');
    }

    private function looksLikeAddressLine(string $line): bool
    {
        return strlen($line) >= 4 && preg_match('/\d/', $line) === 1;
    }

    /**
     * @return array{civic_number: string|null, street: string|null, label: string|null}
     */
    private function parseImportLine(string $line): array
    {
        if (preg_match('/^(\d[\dA-Za-z\-]*)\s+(.+)$/', $line, $matches)) {
            return [
                'civic_number' => $matches[1],
                'street' => $matches[2],
                'label' => null,
            ];
        }

        return [
            'civic_number' => null,
            'street' => null,
            'label' => $line,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function geocodeAddress(array $data): ?array
    {
        $streetLine = trim(implode(' ', array_filter([
            $data['civic_number'] ?? null,
            $data['street'] ?? null,
        ])));

        $parts = array_filter([
            $streetLine ?: ($data['street'] ?? null),
            $data['street2'] ?? null,
            $data['city'] ?? null,
            $data['region'] ?? null,
            $data['postal_code'] ?? null,
            $data['country'] ?? null,
        ]);

        if (count($parts) < 2) {
            return null;
        }

        $response = Http::timeout(8)
            ->retry(2, 200)
            ->withHeaders([
                'User-Agent' => $this->geocodingUserAgent(),
                'Accept-Language' => 'en',
            ])
            ->get('https://nominatim.openstreetmap.org/search', [
                'format' => 'json',
                'limit' => 1,
                'q' => implode(', ', $parts),
            ]);

        if (!$response->ok()) {
            return null;
        }

        $results = $response->json();
        if (!is_array($results) || count($results) === 0) {
            return null;
        }

        $first = $results[0];
        if (!isset($first['lat'], $first['lon'])) {
            return null;
        }

        return [
            'lat' => (float) $first['lat'],
            'lng' => (float) $first['lon'],
        ];
    }

    private function geocodingUserAgent(): string
    {
        $userAgent = (string) config('app.name', 'jwterritory');
        $appUrl = config('app.url');
        if ($appUrl) {
            $userAgent .= ' (' . $appUrl . ')';
        }
        return $userAgent;
    }

    private function ensureOrganization(Request $request, int $organizationId): void
    {
        if ($request->user()->organization_id !== $organizationId) {
            abort(404);
        }
    }
}
