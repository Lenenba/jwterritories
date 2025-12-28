<?php

namespace App\Http\Controllers;

use App\Models\Territory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class MapController extends Controller
{
    /**
     * Display the organization map overview.
     */
    public function index(Request $request): Response
    {
        $territories = Territory::query()
            ->where('organization_id', $request->user()->organization_id)
            ->orderBy('code')
            ->get([
                'id',
                'code',
                'name',
                'map_image_path',
                'overlay_corners',
                'boundary_geojson',
            ])
            ->map(function ($territory) {
                return [
                    'id' => $territory->id,
                    'code' => $territory->code,
                    'name' => $territory->name,
                    'map_image_url' => $territory->map_image_path
                        ? Storage::disk('public')->url($territory->map_image_path)
                        : null,
                    'overlay_corners' => $territory->overlay_corners,
                    'boundary_geojson' => $territory->boundary_geojson,
                ];
            });

        return Inertia::render('map/index', [
            'territories' => $territories,
        ]);
    }
}
