import AppLayout from '@/layouts/app-layout';
import { index as assignmentsIndex } from '@/routes/assignments';
import { index } from '@/routes/map';
import { create, destroy, edit, show as showTerritory } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type MouseEvent, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';

import OrganizationMap from '@/components/organization-map';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

type TerritoryStreet = {
    id: number;
    name: string;
    geojson: unknown;
};

type TerritoryOverlay = {
    id: number;
    code: string;
    name: string;
    map_image_url?: string | null;
    overlay_corners?: unknown;
    boundary_geojson?: unknown;
    streets?: TerritoryStreet[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Map',
        href: index().url,
    },
];

export default function MapIndex({
    territories,
}: {
    territories: TerritoryOverlay[];
}) {
    const [tab, setTab] = useState<'all' | 'ready' | 'pending'>('all');
    const [query, setQuery] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const clearFilters = () => {
        setQuery('');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    const filteredTerritories = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return territories.filter((territory) => {
            const hasOverlay = Boolean(territory.overlay_corners);
            if (tab === 'ready' && !hasOverlay) {
                return false;
            }
            if (tab === 'pending' && hasOverlay) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }
            const haystack = [territory.code, territory.name]
                .join(' ')
                .toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [territories, tab, query]);

    const pagination = useDataTablePagination(filteredTerritories);
    const paginatedTerritories = pagination.paginatedItems;

    const totalCount = territories.length;
    const withImages = territories.filter(
        (territory) => territory.map_image_url,
    ).length;
    const overlayReady = territories.filter(
        (territory) => territory.overlay_corners,
    ).length;
    const overlayPending = totalCount - overlayReady;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Map" />

            <div className="flex flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Organization map</h1>
                    <p className="text-sm text-muted-foreground">
                        Overlay scans and visualize territory street coverage.
                    </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Territories
                        </div>
                        <div className="text-xl font-semibold">
                            {totalCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Images uploaded
                        </div>
                        <div className="text-xl font-semibold">
                            {withImages}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Overlays ready
                        </div>
                        <div className="text-xl font-semibold">
                            {overlayReady}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Pending
                        </div>
                        <div className="text-xl font-semibold">
                            {overlayPending}
                        </div>
                    </div>
                </div>

                <div className="rounded-sm border border-sidebar-border/70 p-4">
                    <div className="mb-3 text-sm font-semibold">
                        Street coverage
                    </div>
                    <OrganizationMap territories={territories} />
                    <p className="mt-3 text-xs text-muted-foreground">
                        Streets are colored by territory. Add streets from a
                        territory to populate this map.
                    </p>
                </div>

                <div className="rounded-sm border border-sidebar-border/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                        <div className="text-sm font-semibold">
                            Overlay list
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'ready', label: 'Ready' },
                                { id: 'pending', label: 'Pending' },
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
                            placeholder="Search territory"
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
                        <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-sm text-muted-foreground">
                            No extra filters available for overlays.
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <DataTable className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Image</th>
                                    <th className="px-4 py-3">Overlay</th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTerritories.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                                        >
                                            No overlays found.
                                        </td>
                                    </tr>
                                )}
                                {paginatedTerritories.map((territory) => (
                                    <tr
                                        key={territory.id}
                                        className="border-t border-sidebar-border/70"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {territory.code}
                                        </td>
                                        <td className="px-4 py-3">
                                            {territory.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {territory.map_image_url
                                                ? 'Uploaded'
                                                : 'Missing'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {territory.overlay_corners
                                                ? 'Ready'
                                                : 'Pending'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        aria-label="Actions"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={showTerritory(
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
                                                    {territory.map_image_url ? (
                                                        <DropdownMenuItem asChild>
                                                            <a
                                                                href={
                                                                    territory.map_image_url
                                                                }
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                Open map image
                                                        </a>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        disabled
                                                    >
                                                        Open map image
                                                    </DropdownMenuItem>
                                                )}
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
                        </DataTable>
                    </div>
                    <DataTablePagination
                        page={pagination.page}
                        pageCount={pagination.pageCount}
                        pageSize={pagination.pageSize}
                        totalItems={pagination.totalItems}
                        onPageChange={pagination.setPage}
                        onPageSizeChange={pagination.setPageSize}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
