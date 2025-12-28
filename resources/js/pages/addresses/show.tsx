import AppLayout from '@/layouts/app-layout';
import {
    destroy as destroyVisit,
    edit as editVisit,
    store as storeVisit,
} from '@/routes/addresses/visits';
import { index as territoriesIndex, show as showTerritory } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
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
import { humanizeDate, isWithinDays } from '@/lib/date';

type Address = {
    id: number;
    civic_number?: string | null;
    unit?: string | null;
    label?: string | null;
    contact_name?: string | null;
    street?: string | null;
    street2?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
    phone?: string | null;
    notes?: string | null;
    status: string;
    do_not_call: boolean;
    last_visit_at?: string | null;
    next_visit_at?: string | null;
    territory: {
        id: number;
        code: string;
        name: string;
    };
};

type Visit = {
    id: number;
    visited_at: string;
    result: string;
    action?: string | null;
    openness?: string | null;
    observed_language?: string | null;
    notes?: string | null;
    person_name?: string | null;
    do_not_call: boolean;
    user?: { id: number; name: string } | null;
};

type Option = {
    label: string;
    value: string;
};

export default function AddressShow({
    address,
    visits,
    resultOptions,
    actionOptions,
}: {
    address: Address;
    visits: Visit[];
    resultOptions: Option[];
    actionOptions: Option[];
}) {
    const [tab, setTab] = useState<'all' | 'recent' | 'follow_up'>('all');
    const [query, setQuery] = useState('');
    const [resultFilter, setResultFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const clearFilters = () => {
        setQuery('');
        setResultFilter('all');
        setActionFilter('all');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    const filteredVisits = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return visits.filter((visit) => {
            if (tab === 'recent' && !isWithinDays(visit.visited_at, 30)) {
                return false;
            }
            if (tab === 'follow_up' && visit.action !== 'follow_up') {
                return false;
            }
            if (resultFilter !== 'all' && visit.result !== resultFilter) {
                return false;
            }
            if (actionFilter !== 'all' && visit.action !== actionFilter) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }

            const haystack = [
                visit.result,
                visit.action,
                visit.notes,
                visit.person_name,
                visit.user?.name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [visits, tab, resultFilter, actionFilter, query]);

    const lastVisit = visits[0];

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Territories',
            href: territoriesIndex().url,
        },
        {
            title: address.territory.code,
            href: showTerritory(address.territory.id).url,
        },
        {
            title: address.label || address.street || 'Address',
            href: '',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Address details" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {address.label || address.street || 'Address'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {[address.civic_number, address.street]
                                .filter(Boolean)
                                .join(' ')}{' '}
                            {address.unit ? `#${address.unit}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {[address.city, address.region, address.postal_code]
                                .filter(Boolean)
                                .join(' ')}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={showTerritory(address.territory.id)}>
                            Back to territory
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 rounded-sm border border-sidebar-border/70 p-4 text-sm">
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                        <div>
                            <span className="text-xs uppercase">Contact</span>
                            <div className="text-foreground">
                                {address.contact_name || '—'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs uppercase">Phone</span>
                            <div className="text-foreground">
                                {address.phone || '—'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs uppercase">Next visit</span>
                            <div className="text-foreground">
                                {humanizeDate(address.next_visit_at)}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs uppercase">
                                Last visit
                            </span>
                            <div className="text-foreground">
                                {lastVisit
                                    ? humanizeDate(lastVisit.visited_at)
                                    : '—'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs uppercase">Visits</span>
                            <div className="text-foreground">
                                {visits.length}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs uppercase">Status</span>
                            <div className="text-foreground">
                                {address.do_not_call
                                    ? 'Do not call'
                                    : address.status}
                            </div>
                        </div>
                    </div>
                    {address.notes && (
                        <p className="text-xs text-muted-foreground">
                            {address.notes}
                        </p>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                    <div className="rounded-sm border border-sidebar-border/70">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                            <div className="text-sm font-semibold">
                                Visit history
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'recent', label: 'Last 30 days' },
                                    { id: 'follow_up', label: 'Follow up' },
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
                                placeholder="Search notes or person"
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
                                    <a href="#log-visit">Add visit</a>
                                </Button>
                            </div>
                        </div>

                        {filtersOpen && (
                            <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-sm">
                                <select
                                    value={resultFilter}
                                    onChange={(event) =>
                                        setResultFilter(event.target.value)
                                    }
                                    className="h-9 rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    <option value="all">All results</option>
                                    {resultOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={actionFilter}
                                    onChange={(event) =>
                                        setActionFilter(event.target.value)
                                    }
                                    className="h-9 rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    <option value="all">All actions</option>
                                    {actionOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Visited</th>
                                        <th className="px-4 py-3">Result</th>
                                    <th className="px-4 py-3">Action</th>
                                    <th className="px-4 py-3">Member</th>
                                    <th className="px-4 py-3">Notes</th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisits.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                                        >
                                            No visits found.
                                        </td>
                                        </tr>
                                    )}
                                    {filteredVisits.map((visit) => (
                                        <tr
                                            key={visit.id}
                                            className="border-t border-sidebar-border/70"
                                        >
                                            <td className="px-4 py-3">
                                                {humanizeDate(
                                                    visit.visited_at,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {visit.do_not_call
                                                    ? 'Do not call'
                                                    : visit.result}
                                            </td>
                                            <td className="px-4 py-3">
                                                {visit.action ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {visit.user?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {visit.notes ?? '-'}
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
                                                                address
                                                                    .territory
                                                                    .id,
                                                            )}
                                                        >
                                                            View territory
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={editVisit({
                                                                address:
                                                                    address.id,
                                                                visit: visit.id,
                                                            })}
                                                        >
                                                            Update visit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <a href="#log-visit">
                                                            Log visit
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={destroyVisit({
                                                                address:
                                                                    address.id,
                                                                visit: visit.id,
                                                            })}
                                                            method="delete"
                                                            as="button"
                                                            onClick={confirmDelete(
                                                                'this visit',
                                                            )}
                                                        >
                                                            Delete visit
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
                        id="log-visit"
                        className="rounded-sm border border-sidebar-border/70 p-4"
                    >
                        <h2 className="mb-3 text-sm font-semibold">
                            Log a visit
                        </h2>
                        <Form
                            {...storeVisit.form(address.id)}
                            options={{ preserveScroll: true }}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="visited_at">
                                            Date and time
                                        </Label>
                                        <Input
                                            id="visited_at"
                                            name="visited_at"
                                            type="datetime-local"
                                            required
                                        />
                                        <InputError
                                            message={errors.visited_at}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="result">Result</Label>
                                        <select
                                            id="result"
                                            name="result"
                                            className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                            defaultValue={
                                                resultOptions[0]?.value ??
                                                'no_answer'
                                            }
                                        >
                                            {resultOptions.length === 0 && (
                                                <option value="no_answer">
                                                    No answer
                                                </option>
                                            )}
                                            {resultOptions.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.result} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="action">Action</Label>
                                        <select
                                            id="action"
                                            name="action"
                                            className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                            defaultValue={
                                                actionOptions[0]?.value ??
                                                'none'
                                            }
                                        >
                                            {actionOptions.length === 0 && (
                                                <option value="none">
                                                    None
                                                </option>
                                            )}
                                            {actionOptions.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.action} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="openness">
                                            Openness
                                        </Label>
                                        <Input
                                            id="openness"
                                            name="openness"
                                            placeholder="Open, unsure, closed..."
                                        />
                                        <InputError
                                            message={errors.openness}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="observed_language">
                                            Observed language
                                        </Label>
                                        <Input
                                            id="observed_language"
                                            name="observed_language"
                                            placeholder="Francophone..."
                                        />
                                        <InputError
                                            message={errors.observed_language}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="person_name">
                                            Person name
                                        </Label>
                                        <Input
                                            id="person_name"
                                            name="person_name"
                                        />
                                        <InputError
                                            message={errors.person_name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="notes">Notes</Label>
                                        <textarea
                                            id="notes"
                                            name="notes"
                                            rows={3}
                                            className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                            placeholder="Follow-up notes..."
                                        />
                                        <InputError message={errors.notes} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="next_visit_at">
                                            Next visit date
                                        </Label>
                                        <Input
                                            id="next_visit_at"
                                            name="next_visit_at"
                                            type="date"
                                        />
                                        <InputError
                                            message={errors.next_visit_at}
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="do_not_call"
                                            className="size-4 rounded-sm border border-input"
                                        />
                                        Do not call
                                    </label>

                                    <Button disabled={processing} type="submit">
                                        Save visit
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
