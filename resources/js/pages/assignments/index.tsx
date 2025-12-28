import AppLayout from '@/layouts/app-layout';
import { destroy, edit, index, store } from '@/routes/assignments';
import { show as showTerritory } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link, usePage } from '@inertiajs/react';
import { type MouseEvent, useMemo, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { humanizeDate, parseDate } from '@/lib/date';

type Assignment = {
    id: number;
    status: string;
    start_at: string;
    due_at: string;
    returned_at?: string | null;
    territory: { id: number; code: string; name: string };
    assignee?: { id: number; name: string } | null;
};

type TerritoryOption = {
    id: number;
    code: string;
    name: string;
};

type AssigneeOption = {
    id: number;
    name: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Assignments',
        href: index().url,
    },
];

export default function AssignmentsIndex({
    assignments,
    territories,
    assignees,
}: {
    assignments: Assignment[];
    territories: TerritoryOption[];
    assignees: AssigneeOption[];
}) {
    const [tab, setTab] = useState<'all' | 'active' | 'overdue' | 'returned'>(
        'all',
    );
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const { url } = usePage();
    const selectedTerritoryId = useMemo(() => {
        const queryString = url.split('?')[1] ?? '';
        return new URLSearchParams(queryString).get('territory') ?? '';
    }, [url]);

    const clearFilters = () => {
        setQuery('');
        setStatusFilter('all');
        setAssigneeFilter('all');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    const isOverdue = (assignment: Assignment) => {
        const dueDate = parseDate(assignment.due_at);
        if (!dueDate) {
            return false;
        }
        return assignment.status === 'active' && dueDate < new Date();
    };

    const filteredAssignments = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return assignments.filter((assignment) => {
            if (tab === 'active' && assignment.status !== 'active') {
                return false;
            }
            if (tab === 'overdue' && !isOverdue(assignment)) {
                return false;
            }
            if (tab === 'returned' && assignment.status !== 'returned') {
                return false;
            }
            if (
                statusFilter !== 'all' &&
                assignment.status !== statusFilter
            ) {
                return false;
            }
            if (
                assigneeFilter !== 'all' &&
                String(assignment.assignee?.id ?? '') !== assigneeFilter
            ) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }

            const haystack = [
                assignment.territory?.code,
                assignment.territory?.name,
                assignment.assignee?.name,
                assignment.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [
        assignments,
        tab,
        statusFilter,
        assigneeFilter,
        query,
        isOverdue,
    ]);

    const totalAssignments = assignments.length;
    const activeCount = assignments.filter(
        (assignment) => assignment.status === 'active',
    ).length;
    const overdueCount = assignments.filter((assignment) =>
        isOverdue(assignment),
    ).length;
    const returnedCount = assignments.filter(
        (assignment) => assignment.status === 'returned',
    ).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assignments" />

            <div className="flex flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Assignments</h1>
                    <p className="text-sm text-muted-foreground">
                        Track who is working each territory and due dates.
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Total
                        </div>
                        <div className="text-xl font-semibold">
                            {totalAssignments}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Active
                        </div>
                        <div className="text-xl font-semibold">
                            {activeCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Overdue
                        </div>
                        <div className="text-xl font-semibold">
                            {overdueCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Returned
                        </div>
                        <div className="text-xl font-semibold">
                            {returnedCount}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-sm border border-sidebar-border/70">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                            <div className="text-sm font-semibold">
                                Assignment list
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'active', label: 'Active' },
                                    { id: 'overdue', label: 'Overdue' },
                                    { id: 'returned', label: 'Returned' },
                                ].map((item) => (
                                    <Button
                                        key={item.id}
                                        variant={
                                            tab === item.id
                                                ? 'default'
                                                : 'ghost'
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setTab(item.id as typeof tab)
                                        }
                                    >
                                        {item.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-sm">
                            <Input
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Search territory or assignee"
                                className="h-9 w-full md:w-64 rounded-sm"
                            />
                            <div className="ml-auto flex flex-wrap items-center gap-2">
                                <Button
                                    variant={filtersOpen ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() =>
                                        setFiltersOpen((open) => !open)
                                    }
                                >
                                    Filters
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    Clear
                                </Button>
                                <Button asChild size="sm">
                                    <a href="#new-assignment">
                                        Add assignment
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {filtersOpen && (
                            <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-sm">
                                <select
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value)
                                    }
                                    className="h-9 rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="returned">Returned</option>
                                </select>
                                <select
                                    value={assigneeFilter}
                                    onChange={(event) =>
                                        setAssigneeFilter(event.target.value)
                                    }
                                    className="h-9 rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    <option value="all">All assignees</option>
                                    {assignees.map((assignee) => (
                                        <option
                                            key={assignee.id}
                                            value={assignee.id}
                                        >
                                            {assignee.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">
                                            Territory
                                        </th>
                                        <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Start</th>
                                    <th className="px-4 py-3">Due</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssignments.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                                        >
                                            No assignments found.
                                        </td>
                                        </tr>
                                    )}
                                    {filteredAssignments.map((assignment) => (
                                        <tr
                                            key={assignment.id}
                                            className="border-t border-sidebar-border/70"
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {assignment.territory.code} -{' '}
                                                {assignment.territory.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                {assignment.assignee?.name ??
                                                    '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {humanizeDate(
                                                    assignment.start_at,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {humanizeDate(assignment.due_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isOverdue(assignment)
                                                    ? 'Overdue'
                                                    : assignment.status}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2"
                                                        >
                                                            Actions
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={showTerritory(
                                                                assignment
                                                                    .territory
                                                                    .id,
                                                            )}
                                                        >
                                                            View territory
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={edit(
                                                                assignment.id,
                                                            )}
                                                        >
                                                            Update assignment
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={destroy(
                                                                assignment.id,
                                                            )}
                                                            method="delete"
                                                            as="button"
                                                            onClick={confirmDelete(
                                                                assignment
                                                                    .territory
                                                                    .code,
                                                            )}
                                                        >
                                                            Delete assignment
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div
                        id="new-assignment"
                        className="rounded-sm border border-sidebar-border/70 p-4"
                    >
                        <h2 className="mb-3 text-sm font-semibold">
                            New assignment
                        </h2>
                        <Form {...store.form()} className="space-y-4">
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="territory_id">
                                            Territory
                                        </Label>
                                        <select
                                            id="territory_id"
                                            name="territory_id"
                                            className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                            defaultValue={selectedTerritoryId}
                                            required
                                        >
                                            <option value="">
                                                Select territory
                                            </option>
                                            {territories.map((territory) => (
                                                <option
                                                    key={territory.id}
                                                    value={territory.id}
                                                >
                                                    {territory.code} -{' '}
                                                    {territory.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            message={errors.territory_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="assignee_user_id">
                                            Assignee
                                        </Label>
                                        <select
                                            id="assignee_user_id"
                                            name="assignee_user_id"
                                            className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                        >
                                            <option value="">Unassigned</option>
                                            {assignees.map((assignee) => (
                                                <option
                                                    key={assignee.id}
                                                    value={assignee.id}
                                                >
                                                    {assignee.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            message={errors.assignee_user_id}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="start_at">
                                            Start date
                                        </Label>
                                        <Input
                                            id="start_at"
                                            name="start_at"
                                            type="date"
                                            required
                                        />
                                        <InputError message={errors.start_at} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="due_at">
                                            Due date
                                        </Label>
                                        <Input
                                            id="due_at"
                                            name="due_at"
                                            type="date"
                                            required
                                        />
                                        <InputError message={errors.due_at} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <textarea
                                            id="notes"
                                            name="notes"
                                            rows={3}
                                            className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                            placeholder="Team, constraints..."
                                        />
                                        <InputError message={errors.notes} />
                                    </div>

                                    <Button disabled={processing} type="submit">
                                        Create assignment
                                    </Button>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
