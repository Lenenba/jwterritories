<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\OrganizationOption;
use App\Models\Visit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitController extends Controller
{
    /**
     * Show the form for editing the specified visit.
     */
    public function edit(Request $request, Address $address, Visit $visit): Response
    {
        $this->ensureOrganization($request, $address->organization_id);
        $this->ensureAddressMatch($address, $visit);

        $address->load('territory:id,code,name');

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

        return Inertia::render('visits/edit', [
            'address' => [
                'id' => $address->id,
                'label' => $address->label,
                'street' => $address->street,
                'civic_number' => $address->civic_number,
                'next_visit_at' => $address->next_visit_at,
                'territory' => $address->territory,
            ],
            'visit' => [
                'id' => $visit->id,
                'visited_at' => $visit->visited_at,
                'result' => $visit->result,
                'action' => $visit->action,
                'openness' => $visit->openness,
                'observed_language' => $visit->observed_language,
                'notes' => $visit->notes,
                'person_name' => $visit->person_name,
                'do_not_call' => $visit->do_not_call,
            ],
            'resultOptions' => $resultOptions,
            'actionOptions' => $actionOptions,
        ]);
    }

    /**
     * Store a newly created visit in storage.
     */
    public function store(Request $request, Address $address): RedirectResponse
    {
        $this->ensureOrganization($request, $address->organization_id);

        $validated = $request->validate([
            'visited_at' => ['required', 'date'],
            'result' => ['required', 'string', 'max:100'],
            'action' => ['nullable', 'string', 'max:100'],
            'openness' => ['nullable', 'string', 'max:100'],
            'observed_language' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'person_name' => ['nullable', 'string', 'max:255'],
            'do_not_call' => ['nullable', 'boolean'],
            'next_visit_at' => ['nullable', 'date'],
        ]);

        $doNotCall = (bool) ($validated['do_not_call'] ?? false);
        if ($validated['result'] === 'do_not_call') {
            $doNotCall = true;
        }

        $visit = new Visit([
            'organization_id' => $request->user()->organization_id,
            'address_id' => $address->id,
            'user_id' => $request->user()->id,
            'visited_at' => $validated['visited_at'],
            'result' => $validated['result'],
            'action' => $validated['action'] ?? null,
            'openness' => $validated['openness'] ?? null,
            'observed_language' => $validated['observed_language'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'person_name' => $validated['person_name'] ?? null,
            'do_not_call' => $doNotCall,
        ]);
        $visit->save();

        $address->status = $doNotCall ? 'do_not_call' : $validated['result'];
        $address->do_not_call = $doNotCall;
        $address->last_visit_at = $validated['visited_at'];
        $address->next_visit_at = $validated['next_visit_at'] ?? null;
        $address->save();

        return to_route('addresses.show', $address);
    }

    /**
     * Update the specified visit in storage.
     */
    public function update(Request $request, Address $address, Visit $visit): RedirectResponse
    {
        $this->ensureOrganization($request, $address->organization_id);
        $this->ensureAddressMatch($address, $visit);

        $wasLatest = $address->visits()->latest('visited_at')->first()?->id === $visit->id;

        $validated = $request->validate([
            'visited_at' => ['required', 'date'],
            'result' => ['required', 'string', 'max:100'],
            'action' => ['nullable', 'string', 'max:100'],
            'openness' => ['nullable', 'string', 'max:100'],
            'observed_language' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'person_name' => ['nullable', 'string', 'max:255'],
            'do_not_call' => ['nullable', 'boolean'],
            'next_visit_at' => ['nullable', 'date'],
        ]);

        $doNotCall = (bool) ($validated['do_not_call'] ?? false);
        if ($validated['result'] === 'do_not_call') {
            $doNotCall = true;
        }

        $visit->fill([
            'visited_at' => $validated['visited_at'],
            'result' => $validated['result'],
            'action' => $validated['action'] ?? null,
            'openness' => $validated['openness'] ?? null,
            'observed_language' => $validated['observed_language'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'person_name' => $validated['person_name'] ?? null,
            'do_not_call' => $doNotCall,
        ]);
        $visit->save();

        $latestVisit = $address->visits()->latest('visited_at')->first();
        $updateNextVisit = $latestVisit?->id === $visit->id;
        $resetNextVisit = $wasLatest && !$updateNextVisit;
        $this->syncAddressFromLatestVisit(
            $address,
            $latestVisit,
            $updateNextVisit ? ($validated['next_visit_at'] ?? null) : null,
            $updateNextVisit || $resetNextVisit
        );

        return to_route('addresses.show', $address);
    }

    /**
     * Remove the specified visit from storage.
     */
    public function destroy(Request $request, Address $address, Visit $visit): RedirectResponse
    {
        $this->ensureOrganization($request, $address->organization_id);
        $this->ensureAddressMatch($address, $visit);

        $latestVisit = $address->visits()->latest('visited_at')->first();
        $wasLatest = $latestVisit?->id === $visit->id;

        $visit->delete();

        $latestVisit = $address->visits()->latest('visited_at')->first();
        $this->syncAddressFromLatestVisit($address, $latestVisit, null, $wasLatest);

        return to_route('addresses.show', $address);
    }

    private function ensureOrganization(Request $request, int $organizationId): void
    {
        if ($request->user()->organization_id !== $organizationId) {
            abort(404);
        }
    }

    private function ensureAddressMatch(Address $address, Visit $visit): void
    {
        if ($visit->address_id !== $address->id) {
            abort(404);
        }
    }

    private function syncAddressFromLatestVisit(
        Address $address,
        ?Visit $latestVisit,
        ?string $nextVisitAt,
        bool $updateNextVisit
    ): void {
        if ($latestVisit) {
            $address->status = $latestVisit->do_not_call ? 'do_not_call' : $latestVisit->result;
            $address->do_not_call = $latestVisit->do_not_call;
            $address->last_visit_at = $latestVisit->visited_at;
            if ($updateNextVisit) {
                $address->next_visit_at = $nextVisitAt;
            }
        } else {
            $address->status = 'not_visited';
            $address->do_not_call = false;
            $address->last_visit_at = null;
            $address->next_visit_at = null;
        }

        $address->save();
    }
}
