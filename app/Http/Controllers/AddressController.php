<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\OrganizationOption;
use App\Models\Territory;
use App\Models\TerritoryStreet;
use Illuminate\Http\JsonResponse;
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
     * Lookup addresses for a street using OpenStreetMap data.
     */
    public function streetLookup(Request $request, Territory $territory): JsonResponse
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $validated = $request->validate([
            'street' => ['required', 'string', 'max:255'],
            'min_lat' => ['required', 'numeric', 'between:-90,90'],
            'min_lng' => ['required', 'numeric', 'between:-180,180'],
            'max_lat' => ['required', 'numeric', 'between:-90,90'],
            'max_lng' => ['required', 'numeric', 'between:-180,180'],
            'city' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'store_street' => ['nullable', 'boolean'],
        ]);

        $street = trim($validated['street']);
        if ($street === '') {
            return response()->json(['addresses' => []]);
        }

        $minLat = (float) $validated['min_lat'];
        $minLng = (float) $validated['min_lng'];
        $maxLat = (float) $validated['max_lat'];
        $maxLng = (float) $validated['max_lng'];

        if ($minLat > $maxLat) {
            [$minLat, $maxLat] = [$maxLat, $minLat];
        }
        if ($minLng > $maxLng) {
            [$minLng, $maxLng] = [$maxLng, $minLng];
        }

        if ($request->boolean('store_street')) {
            $this->storeStreetGeometry(
                $territory,
                $street,
                $minLat,
                $minLng,
                $maxLat,
                $maxLng,
            );
        }

        $streetRegex = $this->escapeOverpassRegex($street);
        $bbox = implode(',', [$minLat, $minLng, $maxLat, $maxLng]);

        $query = <<<QUERY
[out:json][timeout:25];
(
  node["addr:street"~"^{$streetRegex}",i]["addr:housenumber"]({$bbox});
  way["addr:street"~"^{$streetRegex}",i]["addr:housenumber"]({$bbox});
  relation["addr:street"~"^{$streetRegex}",i]["addr:housenumber"]({$bbox});
);
out center;
QUERY;

        $payload = null;
        $lastResponse = null;

        foreach ($this->overpassEndpoints() as $endpoint) {
            $response = Http::timeout(20)
                ->retry(1, 200)
                ->withHeaders([
                    'User-Agent' => $this->geocodingUserAgent(),
                ])
                ->withBody($query, 'text/plain')
                ->post($endpoint);

            if ($response->ok()) {
                $payload = $response->json();
                break;
            }

            $lastResponse = $response;
        }

        if ($payload === null) {
            $detail = [];
            if (app()->environment('local') && $lastResponse) {
                $detail = [
                    'status' => $lastResponse->status(),
                    'body' => substr($lastResponse->body(), 0, 500),
                ];
            }
            return response()->json(
                array_merge(['error' => 'Street lookup failed.'], $detail),
                502,
            );
        }
        $elements = is_array($payload) ? ($payload['elements'] ?? []) : [];
        $expectedCity = $this->normalizePlaceName($validated['city'] ?? null);

        $addresses = collect($elements)
            ->map(function ($element) use ($street, $validated) {
                $tags = $element['tags'] ?? [];
                $houseNumber = $tags['addr:housenumber'] ?? null;
                if (!$houseNumber) {
                    return null;
                }

                $streetName = $tags['addr:street'] ?? $street;
                $lat = $element['lat'] ?? ($element['center']['lat'] ?? null);
                $lng = $element['lon'] ?? ($element['center']['lon'] ?? null);
                if ($lat === null || $lng === null) {
                    return null;
                }

                $city = $tags['addr:city'] ?? ($validated['city'] ?? null);
                $region = $tags['addr:state']
                    ?? $tags['addr:province']
                    ?? $tags['addr:region']
                    ?? ($validated['region'] ?? null);
                $country = $tags['addr:country']
                    ?? $tags['addr:country_code']
                    ?? ($validated['country'] ?? null);

                return [
                    'civic_number' => (string) $houseNumber,
                    'street' => (string) $streetName,
                    'label' => trim($houseNumber . ' ' . $streetName),
                    'city' => $city,
                    'region' => $region,
                    'postal_code' => $tags['addr:postcode'] ?? null,
                    'country' => $country,
                    'lat' => (float) $lat,
                    'lng' => (float) $lng,
                ];
            })
            ->filter()
            ->filter(function ($row) use ($expectedCity) {
                if ($expectedCity === '' || empty($row['city'])) {
                    return true;
                }
                return $this->normalizePlaceName($row['city']) === $expectedCity;
            })
            ->unique(function ($row) {
                return strtolower(trim(implode('|', [
                    $row['civic_number'] ?? '',
                    $row['street'] ?? '',
                    $row['postal_code'] ?? '',
                ])));
            })
            ->take(500)
            ->values()
            ->all();

        return response()->json(['addresses' => $addresses]);
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

    private function normalizePlaceName(?string $value): string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }

        $lowered = function_exists('mb_strtolower')
            ? mb_strtolower($value, 'UTF-8')
            : strtolower($value);
        $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lowered);
        $normalized = $transliterated !== false ? $transliterated : $lowered;
        $normalized = preg_replace('/[^a-z0-9]+/', ' ', $normalized);

        return trim((string) $normalized);
    }

    private function escapeOverpassRegex(string $value): string
    {
        $escaped = preg_quote($value, '/');
        return str_replace('"', '\\"', $escaped);
    }

    /**
     * @return array<int, string>
     */
    private function overpassEndpoints(): array
    {
        return [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter',
            'https://overpass.nchc.org.tw/api/interpreter',
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

    private function storeStreetGeometry(
        Territory $territory,
        string $street,
        float $minLat,
        float $minLng,
        float $maxLat,
        float $maxLng,
    ): void {
        $street = trim($street);
        if ($street === '') {
            return;
        }

        $normalized = $this->normalizeStreetName($street);
        if ($normalized === '') {
            return;
        }

        $existing = TerritoryStreet::query()
            ->where('territory_id', $territory->id)
            ->where('name_normalized', $normalized)
            ->first();

        if ($existing && $existing->geojson) {
            return;
        }

        $geojson = $this->fetchStreetGeojson(
            $street,
            $minLat,
            $minLng,
            $maxLat,
            $maxLng,
        );

        if ($geojson === null) {
            return;
        }

        TerritoryStreet::updateOrCreate(
            [
                'territory_id' => $territory->id,
                'name_normalized' => $normalized,
            ],
            [
                'name' => $street,
                'geojson' => $geojson,
                'source' => 'overpass',
            ],
        );
    }

    private function fetchStreetGeojson(
        string $street,
        float $minLat,
        float $minLng,
        float $maxLat,
        float $maxLng,
    ): ?array {
        $streetRegex = $this->escapeOverpassRegex($street);
        $bbox = implode(',', [$minLat, $minLng, $maxLat, $maxLng]);

        $query = <<<QUERY
[out:json][timeout:25];
(
  way["highway"]["name"~"^{$streetRegex}$",i]({$bbox});
);
out geom;
QUERY;

        $payload = null;

        foreach ($this->overpassEndpoints() as $endpoint) {
            $response = Http::timeout(20)
                ->retry(1, 200)
                ->withHeaders([
                    'User-Agent' => $this->geocodingUserAgent(),
                ])
                ->withBody($query, 'text/plain')
                ->post($endpoint);

            if ($response->ok()) {
                $payload = $response->json();
                break;
            }

        }

        if ($payload === null) {
            return null;
        }

        $elements = is_array($payload) ? ($payload['elements'] ?? []) : [];
        $features = [];

        foreach ($elements as $element) {
            if (($element['type'] ?? '') !== 'way') {
                continue;
            }

            $geometry = $element['geometry'] ?? null;
            if (!is_array($geometry) || count($geometry) < 2) {
                continue;
            }

            $coordinates = [];
            foreach ($geometry as $point) {
                if (!isset($point['lon'], $point['lat'])) {
                    continue;
                }
                $coordinates[] = [
                    (float) $point['lon'],
                    (float) $point['lat'],
                ];
            }

            if (count($coordinates) < 2) {
                continue;
            }

            $features[] = [
                'type' => 'Feature',
                'properties' => [
                    'name' => $element['tags']['name'] ?? $street,
                    'osm_id' => $element['id'] ?? null,
                ],
                'geometry' => [
                    'type' => 'LineString',
                    'coordinates' => $coordinates,
                ],
            ];
        }

        if (!$features) {
            return null;
        }

        return [
            'type' => 'FeatureCollection',
            'features' => $features,
        ];
    }

    private function normalizeStreetName(string $value): string
    {
        return $this->normalizePlaceName($value);
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
