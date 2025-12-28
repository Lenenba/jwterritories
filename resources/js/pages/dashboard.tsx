import AppLayout from '@/layouts/app-layout';
import { show as showAddress } from '@/routes/addresses';
import { destroy as destroyVisit, edit as editVisit } from '@/routes/addresses/visits';
import { dashboard } from '@/routes';
import { index as territoriesIndex, show as showTerritory } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type MouseEvent, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { humanizeDate, isWithinDays } from '@/lib/date';

type Kpis = {
    territories: number;
    addresses: number;
    visits: number;
    activeAssignments: number;
    overdueAssignments: number;
};

type VisitRow = {
    id: number;
    visited_at: string;
    result: string;
    action?: string | null;
    user?: { id: number; name: string } | null;
    address?: {
        id?: number | null;
        territory_id?: number | null;
        label?: string | null;
        street?: string | null;
        civic_number?: string | null;
        territory_code?: string | null;
    } | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard({
    kpis,
    recentVisits,
}: {
    kpis: Kpis;
    recentVisits: VisitRow[];
}) {
    const [tab, setTab] = useState<'all' | 'recent' | 'follow_up'>('all');
    const [query, setQuery] = useState('');
    const [resultFilter, setResultFilter] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const clearFilters = () => {
        setQuery('');
        setResultFilter('all');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    const resultOptions = useMemo(() => {
        const values = new Set(
            recentVisits.map((visit) => visit.result).filter(Boolean),
        );
        return Array.from(values);
    }, [recentVisits]);

    const filteredVisits = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return recentVisits.filter((visit) => {
            if (tab === 'recent' && !isWithinDays(visit.visited_at, 7)) {
                return false;
            }
            if (tab === 'follow_up' && visit.action !== 'follow_up') {
                return false;
            }
            if (resultFilter !== 'all' && visit.result !== resultFilter) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }

            const addressText = [
                visit.address?.civic_number,
                visit.address?.street,
                visit.address?.label,
                visit.address?.territory_code,
                visit.user?.name,
                visit.result,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return addressText.includes(normalizedQuery);
        });
    }, [recentVisits, tab, resultFilter, query]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Overview of territory activity and field work.
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Territories
                        </div>
                        <div className="text-xl font-semibold">
                            {kpis.territories}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Addresses
                        </div>
                        <div className="text-xl font-semibold">
                            {kpis.addresses}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Visits
                        </div>
                        <div className="text-xl font-semibold">
                            {kpis.visits}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Active assignments
                        </div>
                        <div className="text-xl font-semibold">
                            {kpis.activeAssignments}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Overdue
                        </div>
                        <div className="text-xl font-semibold">
                            {kpis.overdueAssignments}
                        </div>
                    </div>
                </div>

                <div className="rounded-sm border border-sidebar-border/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                        <div>
                            <div className="text-sm font-semibold">
                                Recent visits
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Latest field activity across territories.
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'recent', label: 'Last 7 days' },
                                { id: 'follow_up', label: 'Follow up' },
                            ].map((item) => (
                                <Button
                                    key={item.id}
                                    variant={
                                        tab === item.id ? 'default' : 'ghost'
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
                            placeholder="Search territory, address, or member"
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
                                <Link href={territoriesIndex()}>
                                    Add visit
                                </Link>
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
                                {resultOptions.map((result) => (
                                    <option key={result} value={result}>
                                        {result}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Territory</th>
                                    <th className="px-4 py-3">Address</th>
                                    <th className="px-4 py-3">Result</th>
                                    <th className="px-4 py-3">Action</th>
                                    <th className="px-4 py-3">Member</th>
                                    <th className="px-4 py-3">Visited</th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisits.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
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
                                        <td className="px-4 py-3 font-medium">
                                            {visit.address?.territory_code ??
                                                '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {[
                                                visit.address?.civic_number,
                                                visit.address?.street,
                                                visit.address?.label,
                                            ]
                                                .filter(Boolean)
                                                .join(' ') || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {visit.result}
                                        </td>
                                        <td className="px-4 py-3">
                                            {visit.action ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {visit.user?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {humanizeDate(visit.visited_at)}
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
                                                {visit.address?.id ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={showAddress(
                                                                visit.address
                                                                    .id,
                                                            )}
                                                        >
                                                            View address
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem disabled>
                                                        View address
                                                    </DropdownMenuItem>
                                                )}
                                                {visit.address?.territory_id ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={showTerritory(
                                                                visit.address
                                                                    .territory_id,
                                                            )}
                                                        >
                                                            View territory
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem disabled>
                                                        View territory
                                                    </DropdownMenuItem>
                                                )}
                                                {visit.address?.id ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={editVisit({
                                                                address:
                                                                    visit.address
                                                                        .id,
                                                                visit: visit.id,
                                                            })}
                                                        >
                                                            Update visit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem disabled>
                                                        Update visit
                                                    </DropdownMenuItem>
                                                )}
                                                {visit.address?.id ? (
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={destroyVisit({
                                                                address:
                                                                    visit.address
                                                                        .id,
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
                                                ) : (
                                                    <DropdownMenuItem disabled>
                                                        Delete visit
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
