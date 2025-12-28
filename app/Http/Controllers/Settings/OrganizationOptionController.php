<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\OrganizationOption;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationOptionController extends Controller
{
    /**
     * Show the organization options settings page.
     */
    public function edit(Request $request): Response
    {
        $this->ensureAdmin($request);

        $organizationId = $request->user()->organization_id;
        $options = OrganizationOption::query()
            ->where('organization_id', $organizationId)
            ->orderBy('list_key')
            ->orderBy('sort')
            ->orderBy('label')
            ->get(['id', 'list_key', 'label', 'value', 'sort', 'is_active']);

        return Inertia::render('settings/options', [
            'options' => [
                'address_status' => $options->where('list_key', 'address_status')->values(),
                'visit_result' => $options->where('list_key', 'visit_result')->values(),
                'visit_action' => $options->where('list_key', 'visit_action')->values(),
            ],
        ]);
    }

    /**
     * Store a newly created option.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'list_key' => ['required', 'string', 'in:address_status,visit_result,visit_action'],
            'label' => ['required', 'string', 'max:100'],
            'value' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ]);

        $value = $validated['value'] ?? Str::slug($validated['label'], '_');
        if ($value === '') {
            $value = 'option_'.Str::random(6);
        }

        OrganizationOption::updateOrCreate(
            [
                'organization_id' => $request->user()->organization_id,
                'list_key' => $validated['list_key'],
                'value' => $value,
            ],
            [
                'label' => $validated['label'],
                'sort' => $validated['sort'] ?? 0,
                'is_active' => true,
            ]
        );

        return back();
    }

    /**
     * Remove the specified option from storage.
     */
    public function destroy(Request $request, OrganizationOption $option): RedirectResponse
    {
        $this->ensureAdmin($request);

        if ($option->organization_id !== $request->user()->organization_id) {
            abort(404);
        }

        $option->delete();

        return back();
    }

    private function ensureAdmin(Request $request): void
    {
        if ($request->user()->role !== 'admin') {
            abort(403);
        }
    }
}
