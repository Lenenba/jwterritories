import AppLayout from '@/layouts/app-layout';
import { index as assignmentsIndex } from '@/routes/assignments';
import { create, destroy, edit, index, show } from '@/routes/territories';
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
import { humanizeDate } from '@/lib/date';

type Territory = {
    id: number;
    code: string;
    name: string;
    territory_type?: string | null;
    dominant_language?: string | null;
    addresses_count: number;
    updated_at: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Territories',
        href: index().url,
    },
];

export default function TerritoriesIndex({
    territories,
}: {
    territories: Territory[];
}) {
    const [tab, setTab] = useState<'all' | 'with' | 'empty'>('all');
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const clearFilters = () => {
        setQuery('');
        setTypeFilter('all');
        setLanguageFilter('all');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    const typeOptions = useMemo(() => {
        const values = new Set(
            territories.map((territory) => territory.territory_type).filter(Boolean),
        );
        return Array.from(values);
    }, [territories]);

    const languageOptions = useMemo(() => {
        const values = new Set(
            territories
                .map((territory) => territory.dominant_language)
                .filter(Boolean),
        );
        return Array.from(values);
    }, [territories]);

    const filteredTerritories = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return territories.filter((territory) => {
            if (tab === 'with' && territory.addresses_count === 0) {
                return false;
            }
            if (tab === 'empty' && territory.addresses_count > 0) {
                return false;
            }
            if (
                typeFilter !== 'all' &&
                territory.territory_type !== typeFilter
            ) {
                return false;
            }
            if (
                languageFilter !== 'all' &&
                territory.dominant_language !== languageFilter
            ) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }

            const haystack = [
                territory.code,
                territory.name,
                territory.territory_type ?? '',
                territory.dominant_language ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [territories, tab, typeFilter, languageFilter, query]);

    const totalCount = territories.length;
    const withAddresses = territories.filter(
        (territory) => territory.addresses_count > 0,
    ).length;
    const emptyCount = totalCount - withAddresses;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Territories" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Territories</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage your small territories and their addresses.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Total
                        </div>
                        <div className="text-xl font-semibold">
                            {totalCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            With addresses
                        </div>
                        <div className="text-xl font-semibold">
                            {withAddresses}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Empty
                        </div>
                        <div className="text-xl font-semibold">
                            {emptyCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Languages
                        </div>
                        <div className="text-xl font-semibold">
                            {languageOptions.length}
                        </div>
                    </div>
                </div>

                <div className="rounded-sm border border-sidebar-border/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                        <div className="text-sm font-semibold">
                            Territory list
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'with', label: 'With addresses' },
                                { id: 'empty', label: 'Empty' },
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
                            placeholder="Search code or name"
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
                                <Link href={create()}>
                                    Add territory
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {filtersOpen && (
                        <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-sm">
                            <select
                                value={typeFilter}
                                onChange={(event) =>
                                    setTypeFilter(event.target.value)
                                }
                                className="h-9 rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                            >
                                <option value="all">All types</option>
                                {typeOptions.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={languageFilter}
                                onChange={(event) =>
                                    setLanguageFilter(event.target.value)
                                }
                                className="h-9 rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                            >
                                <option value="all">All languages</option>
                                {languageOptions.map((language) => (
                                    <option key={language} value={language}>
                                        {language}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Language</th>
                                <th className="px-4 py-3">Updated</th>
                                <th className="px-4 py-3 text-right">
                                    Addresses
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTerritories.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                                    >
                                        No territories found.
                                    </td>
                                </tr>
                            )}
                            {filteredTerritories.map((territory) => (
                                <tr
                                    key={territory.id}
                                    className="border-t border-sidebar-border/70"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        <Link
                                            href={show(territory.id)}
                                            className="underline-offset-4 transition hover:underline"
                                        >
                                            {territory.code}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        {territory.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        {territory.territory_type ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {territory.dominant_language ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {humanizeDate(territory.updated_at)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {territory.addresses_count}
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
                                                        href={show(
                                                            territory.id,
                                                        )}
                                                    >
                                                        View territory
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={edit(
                                                            territory.id,
                                                        )}
                                                    >
                                                        Update territory
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={assignmentsIndex(
                                                            {
                                                                query: {
                                                                    territory:
                                                                        territory.id,
                                                                },
                                                            },
                                                        )}
                                                    >
                                                        Assign territory
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={destroy(
                                                            territory.id,
                                                        )}
                                                        method="delete"
                                                        as="button"
                                                        onClick={confirmDelete(
                                                            territory.code,
                                                        )}
                                                    >
                                                        Delete territory
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
        </AppLayout>
    );
}
