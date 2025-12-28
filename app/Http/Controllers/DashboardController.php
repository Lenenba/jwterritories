<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\Assignment;
use App\Models\Territory;
use App\Models\Visit;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard.
     */
    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;

        $territoryCount = Territory::where('organization_id', $organizationId)->count();
        $addressCount = Address::where('organization_id', $organizationId)->count();
        $visitCount = Visit::where('organization_id', $organizationId)->count();
        $activeAssignments = Assignment::where('organization_id', $organizationId)
            ->where('status', 'active')
            ->count();
        $overdueAssignments = Assignment::where('organization_id', $organizationId)
            ->where('status', 'active')
            ->where('due_at', '<', now())
            ->count();

        $recentVisits = Visit::query()
            ->where('organization_id', $organizationId)
            ->with([
                'user:id,name',
                'address:id,territory_id,label,street,civic_number',
                'address.territory:id,code',
            ])
            ->latest('visited_at')
            ->limit(10)
            ->get()
            ->map(function ($visit) {
                return [
                    'id' => $visit->id,
                    'visited_at' => $visit->visited_at,
                    'result' => $visit->result,
                    'action' => $visit->action,
                    'user' => $visit->user,
                    'address' => [
                        'id' => $visit->address?->id,
                        'territory_id' => $visit->address?->territory_id,
                        'label' => $visit->address?->label,
                        'street' => $visit->address?->street,
                        'civic_number' => $visit->address?->civic_number,
                        'territory_code' => $visit->address?->territory?->code,
                    ],
                ];
            });

        return Inertia::render('dashboard', [
            'kpis' => [
                'territories' => $territoryCount,
                'addresses' => $addressCount,
                'visits' => $visitCount,
                'activeAssignments' => $activeAssignments,
                'overdueAssignments' => $overdueAssignments,
            ],
            'recentVisits' => $recentVisits,
        ]);
    }
}
