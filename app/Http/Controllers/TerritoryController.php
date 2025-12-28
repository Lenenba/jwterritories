<?php

namespace App\Http\Controllers;

use App\Models\OrganizationOption;
use App\Models\Territory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TerritoryController extends Controller
{
    /**
     * Display a listing of the territories.
     */
    public function index(Request $request): Response
    {
        $territories = Territory::query()
            ->where('organization_id', $request->user()->organization_id)
            ->withCount('addresses')
            ->orderBy('code')
            ->get([
                'id',
                'organization_id',
                'code',
                'name',
                'territory_type',
                'dominant_language',
                'updated_at',
            ]);

        return Inertia::render('territories/index', [
            'territories' => $territories,
        ]);
    }

    /**
     * Show the form for creating a new territory.
     */
    public function create(Request $request): Response
    {
        $parents = Territory::query()
            ->where('organization_id', $request->user()->organization_id)
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return Inertia::render('territories/create', [
            'parents' => $parents,
        ]);
    }

    /**
     * Show the form for editing the specified territory.
     */
    public function edit(Request $request, Territory $territory): Response
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $parents = Territory::query()
            ->where('organization_id', $request->user()->organization_id)
            ->whereNull('parent_id')
            ->where('id', '!=', $territory->id)
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return Inertia::render('territories/edit', [
            'territory' => [
                'id' => $territory->id,
                'parent_id' => $territory->parent_id,
                'code' => $territory->code,
                'name' => $territory->name,
                'territory_type' => $territory->territory_type,
                'dominant_language' => $territory->dominant_language,
                'notes' => $territory->notes,
                'map_image_url' => $territory->map_image_path
                    ? Storage::disk('public')->url($territory->map_image_path)
                    : null,
            ],
            'parents' => $parents,
        ]);
    }

    /**
     * Store a newly created territory in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $organizationId = $request->user()->organization_id;

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('territories', 'code')->where('organization_id', $organizationId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'territory_type' => ['nullable', 'string', 'max:100'],
            'dominant_language' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'parent_id' => [
                'nullable',
                Rule::exists('territories', 'id')->where('organization_id', $organizationId),
            ],
            'map_image' => ['nullable', 'image', 'max:5120'],
            'overlay_corners' => ['nullable'],
            'boundary_geojson' => ['nullable'],
        ]);

        $territory = new Territory([
            'organization_id' => $organizationId,
            'parent_id' => $validated['parent_id'] ?? null,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'territory_type' => $validated['territory_type'] ?? null,
            'dominant_language' => $validated['dominant_language'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        if ($request->hasFile('map_image')) {
            $path = $request->file('map_image')->storePublicly('territory-maps', 'public');
            $territory->map_image_path = $path;

            $size = getimagesize($request->file('map_image')->getRealPath());
            if ($size) {
                $territory->map_image_width = $size[0];
                $territory->map_image_height = $size[1];
            }
        }

        $overlayCorners = $validated['overlay_corners'] ?? null;
        if (is_string($overlayCorners)) {
            $overlayCorners = json_decode($overlayCorners, true);
        }
        if ($overlayCorners) {
            $territory->overlay_corners = $overlayCorners;
        }

        $boundaryGeojson = $validated['boundary_geojson'] ?? null;
        if (is_string($boundaryGeojson)) {
            $boundaryGeojson = json_decode($boundaryGeojson, true);
        }
        if ($boundaryGeojson) {
            $territory->boundary_geojson = $boundaryGeojson;
        }

        $territory->save();

        return to_route('territories.show', $territory);
    }

    /**
     * Update the specified territory in storage.
     */
    public function update(Request $request, Territory $territory): RedirectResponse
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $organizationId = $request->user()->organization_id;

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('territories', 'code')
                    ->where('organization_id', $organizationId)
                    ->ignore($territory->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'territory_type' => ['nullable', 'string', 'max:100'],
            'dominant_language' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'parent_id' => [
                'nullable',
                Rule::exists('territories', 'id')
                    ->where('organization_id', $organizationId)
                    ->where(fn ($query) => $query->where('id', '!=', $territory->id)),
            ],
            'map_image' => ['nullable', 'image', 'max:5120'],
            'overlay_corners' => ['nullable'],
            'boundary_geojson' => ['nullable'],
        ]);

        $territory->fill([
            'parent_id' => $validated['parent_id'] ?? null,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'territory_type' => $validated['territory_type'] ?? null,
            'dominant_language' => $validated['dominant_language'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        if ($request->hasFile('map_image')) {
            if ($territory->map_image_path) {
                Storage::disk('public')->delete($territory->map_image_path);
            }

            $path = $request->file('map_image')->storePublicly('territory-maps', 'public');
            $territory->map_image_path = $path;

            $size = getimagesize($request->file('map_image')->getRealPath());
            if ($size) {
                $territory->map_image_width = $size[0];
                $territory->map_image_height = $size[1];
            }
        }

        if (array_key_exists('overlay_corners', $validated)) {
            $overlayCorners = $validated['overlay_corners'];
            if (is_string($overlayCorners)) {
                $overlayCorners = json_decode($overlayCorners, true);
            }
            if ($overlayCorners) {
                $territory->overlay_corners = $overlayCorners;
            }
        }

        if (array_key_exists('boundary_geojson', $validated)) {
            $boundaryGeojson = $validated['boundary_geojson'];
            if (is_string($boundaryGeojson)) {
                $boundaryGeojson = json_decode($boundaryGeojson, true);
            }
            if ($boundaryGeojson) {
                $territory->boundary_geojson = $boundaryGeojson;
            }
        }

        $territory->save();

        return to_route('territories.show', $territory);
    }

    /**
     * Display the specified territory.
     */
    public function show(Request $request, Territory $territory): Response
    {
        $this->ensureOrganization($request, $territory->organization_id);

        $territory->load(['addresses' => function ($query) {
            $query->orderBy('street')->orderBy('label');
        }]);

        $territoryData = [
            'id' => $territory->id,
            'code' => $territory->code,
            'name' => $territory->name,
            'territory_type' => $territory->territory_type,
            'dominant_language' => $territory->dominant_language,
            'notes' => $territory->notes,
            'map_image_url' => $territory->map_image_path
                ? Storage::disk('public')->url($territory->map_image_path)
                : null,
            'overlay_corners' => $territory->overlay_corners,
            'boundary_geojson' => $territory->boundary_geojson,
        ];

        $addresses = $territory->addresses->map(function ($address) {
            return [
                'id' => $address->id,
                'civic_number' => $address->civic_number,
                'label' => $address->label,
                'street' => $address->street,
                'city' => $address->city,
                'lat' => $address->lat !== null ? (float) $address->lat : null,
                'lng' => $address->lng !== null ? (float) $address->lng : null,
                'status' => $address->status,
                'last_visit_at' => $address->last_visit_at,
                'next_visit_at' => $address->next_visit_at,
                'do_not_call' => $address->do_not_call,
            ];
        });

        $statusOptions = OrganizationOption::query()
            ->where('organization_id', $request->user()->organization_id)
            ->where('list_key', 'address_status')
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('label')
            ->get(['label', 'value']);

        return Inertia::render('territories/show', [
            'territory' => $territoryData,
            'addresses' => $addresses,
            'statusOptions' => $statusOptions,
        ]);
    }

    /**
     * Remove the specified territory from storage.
     */
    public function destroy(Request $request, Territory $territory): RedirectResponse
    {
        $this->ensureOrganization($request, $territory->organization_id);

        if ($territory->map_image_path) {
            Storage::disk('public')->delete($territory->map_image_path);
        }

        $territory->delete();

        return to_route('territories.index');
    }

    private function ensureOrganization(Request $request, int $organizationId): void
    {
        if ($request->user()->organization_id !== $organizationId) {
            abort(404);
        }
    }
}
