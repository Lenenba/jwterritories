<?php

namespace App\Http\Controllers;

use App\Models\Assignment;
use App\Models\Territory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AssignmentController extends Controller
{
    /**
     * Display a listing of the assignments.
     */
    public function index(Request $request): Response
    {
        $organizationId = $request->user()->organization_id;

        $assignments = Assignment::query()
            ->where('organization_id', $organizationId)
            ->with([
                'territory:id,code,name',
                'assignee:id,name',
            ])
            ->orderByDesc('start_at')
            ->get();

        $territories = Territory::query()
            ->where('organization_id', $organizationId)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $assignees = User::query()
            ->where('organization_id', $organizationId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('assignments/index', [
            'assignments' => $assignments,
            'territories' => $territories,
            'assignees' => $assignees,
        ]);
    }

    /**
     * Show the form for editing the specified assignment.
     */
    public function edit(Request $request, Assignment $assignment): Response
    {
        $this->ensureOrganization($request, $assignment->organization_id);

        $organizationId = $request->user()->organization_id;

        $territories = Territory::query()
            ->where('organization_id', $organizationId)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $assignees = User::query()
            ->where('organization_id', $organizationId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('assignments/edit', [
            'assignment' => [
                'id' => $assignment->id,
                'territory_id' => $assignment->territory_id,
                'assignee_user_id' => $assignment->assignee_user_id,
                'start_at' => $assignment->start_at,
                'due_at' => $assignment->due_at,
                'returned_at' => $assignment->returned_at,
                'status' => $assignment->status,
                'notes' => $assignment->notes,
            ],
            'territories' => $territories,
            'assignees' => $assignees,
        ]);
    }

    /**
     * Store a newly created assignment in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $organizationId = $request->user()->organization_id;

        $validated = $request->validate([
            'territory_id' => [
                'required',
                Rule::exists('territories', 'id')->where('organization_id', $organizationId),
            ],
            'assignee_user_id' => [
                'nullable',
                Rule::exists('users', 'id')->where('organization_id', $organizationId),
            ],
            'start_at' => ['required', 'date'],
            'due_at' => ['required', 'date', 'after_or_equal:start_at'],
            'notes' => ['nullable', 'string'],
        ]);

        $start = Carbon::parse($validated['start_at']);
        $due = Carbon::parse($validated['due_at']);
        if ($due->greaterThan($start->copy()->addDays(30))) {
            return back()->withErrors([
                'due_at' => 'La date limite doit etre dans les 30 jours suivant le debut.',
            ]);
        }

        Assignment::create([
            'organization_id' => $organizationId,
            'territory_id' => $validated['territory_id'],
            'assignee_user_id' => $validated['assignee_user_id'] ?? null,
            'start_at' => $validated['start_at'],
            'due_at' => $validated['due_at'],
            'status' => 'active',
            'notes' => $validated['notes'] ?? null,
        ]);

        return to_route('assignments.index');
    }

    /**
     * Update the specified assignment in storage.
     */
    public function update(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->ensureOrganization($request, $assignment->organization_id);

        $organizationId = $request->user()->organization_id;

        $validated = $request->validate([
            'territory_id' => [
                'required',
                Rule::exists('territories', 'id')->where('organization_id', $organizationId),
            ],
            'assignee_user_id' => [
                'nullable',
                Rule::exists('users', 'id')->where('organization_id', $organizationId),
            ],
            'start_at' => ['required', 'date'],
            'due_at' => ['required', 'date', 'after_or_equal:start_at'],
            'returned_at' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $start = Carbon::parse($validated['start_at']);
        $due = Carbon::parse($validated['due_at']);
        if ($due->greaterThan($start->copy()->addDays(30))) {
            return back()->withErrors([
                'due_at' => 'La date limite doit etre dans les 30 jours suivant le debut.',
            ]);
        }

        $status = $validated['status'] ?? $assignment->status;
        $returnedAt = $validated['returned_at'] ?? $assignment->returned_at;
        if ($status === 'returned' && !$returnedAt) {
            $returnedAt = now();
        }
        if ($status !== 'returned' && empty($validated['returned_at'])) {
            $returnedAt = null;
        }

        $assignment->fill([
            'territory_id' => $validated['territory_id'],
            'assignee_user_id' => $validated['assignee_user_id'] ?? null,
            'start_at' => $validated['start_at'],
            'due_at' => $validated['due_at'],
            'status' => $status,
            'returned_at' => $returnedAt,
            'notes' => $validated['notes'] ?? null,
        ]);
        $assignment->save();

        return to_route('assignments.index');
    }

    /**
     * Remove the specified assignment from storage.
     */
    public function destroy(Request $request, Assignment $assignment): RedirectResponse
    {
        $this->ensureOrganization($request, $assignment->organization_id);

        $assignment->delete();

        return to_route('assignments.index');
    }

    private function ensureOrganization(Request $request, int $organizationId): void
    {
        if ($request->user()->organization_id !== $organizationId) {
            abort(404);
        }
    }
}
