import AppLayout from '@/layouts/app-layout';
import { destroy as destroyAddress, edit as editAddress, show as showAddress } from '@/routes/addresses';
import { index as territoriesIndex, show as territoriesShow } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type MouseEvent, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';

import AddressScanImport from '@/components/address-scan-import';
import AddressSearchDialog from '@/components/address-search-dialog';
import TerritoryMap from '@/components/territory-map';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { humanizeDate } from '@/lib/date';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

type Territory = {
    id: number;
    code: string;
    name: string;
    territory_type?: string | null;
    dominant_language?: string | null;
    notes?: string | null;
    map_image_url?: string | null;
};

type Address = {
    id: number;
    civic_number?: string | null;
    label?: string | null;
    street?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    status: string;
    last_visit_at?: string | null;
    next_visit_at?: string | null;
    do_not_call: boolean;
};

type Street = {
    id: number;
    name: string;
    geojson: unknown;
};

type Option = {
    label: string;
    value: string;
};

export default function TerritoryShow({
    territory,
    addresses,
    streets = [],
    statusOptions,
}: {
    territory: Territory;
    addresses: Address[];
    streets?: Street[];
    statusOptions: Option[];
}) {
    const [tab, setTab] = useState<'all' | 'active' | 'do_not_call'>('all');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [scanDialogOpen, setScanDialogOpen] = useState(false);

    const clearFilters = () => {
        setQuery('');
        setStatusFilter('all');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    const filteredAddresses = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return addresses.filter((address) => {
            if (tab === 'active' && address.do_not_call) {
                return false;
            }
            if (tab === 'do_not_call' && !address.do_not_call) {
                return false;
            }
            if (
                statusFilter !== 'all' &&
                address.status !== statusFilter
            ) {
                return false;
            }
            if (!normalizedQuery) {
                return true;
            }

            const haystack = [
                address.civic_number,
                address.street,
                address.label,
                address.city,
                address.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedQuery);
        });
    }, [addresses, tab, statusFilter, query]);

    const pagination = useDataTablePagination(filteredAddresses);
    const paginatedAddresses = pagination.paginatedItems;

    const totalAddresses = addresses.length;
    const mappedCount = addresses.filter(
        (address) =>
            typeof address.lat === 'number' &&
            typeof address.lng === 'number',
    ).length;
    const missingCount = totalAddresses - mappedCount;
    const doNotCallCount = addresses.filter(
        (address) => address.do_not_call,
    ).length;
    const visitedCount = addresses.filter(
        (address) =>
            address.status !== 'not_visited' && !address.do_not_call,
    ).length;
    const upcomingCount = addresses.filter(
        (address) => Boolean(address.next_visit_at),
    ).length;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Territories',
            href: territoriesIndex().url,
        },
        {
            title: territory.code,
            href: territoriesShow(territory.id).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Territory ${territory.code}`} />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            {territory.code} - {territory.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {territory.territory_type ?? 'Small territory'}{' '}
                            {territory.dominant_language
                                ? `• ${territory.dominant_language}`
                                : ''}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={territoriesIndex()}>Back to list</Link>
                    </Button>
                </div>

                {territory.notes && (
                    <div className="rounded-sm border border-sidebar-border/70 p-4 text-sm text-muted-foreground">
                        {territory.notes}
                    </div>
                )}

                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Addresses
                        </div>
                        <div className="text-xl font-semibold">
                            {totalAddresses}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Visited
                        </div>
                        <div className="text-xl font-semibold">
                            {visitedCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Do not call
                        </div>
                        <div className="text-xl font-semibold">
                            {doNotCallCount}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Follow-ups
                        </div>
                        <div className="text-xl font-semibold">
                            {upcomingCount}
                        </div>
                    </div>
                </div>

                <div className="rounded-sm border border-sidebar-border/70 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold">Map</h2>
                        {territory.map_image_url ? (
                            <Button asChild variant="ghost" size="sm">
                                <a
                                    href={territory.map_image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open scan
                                </a>
                            </Button>
                        ) : null}
                    </div>
                    <TerritoryMap addresses={addresses} streets={streets} />
                    <p className="mt-3 text-xs text-muted-foreground">
                        Mapped {mappedCount} of {totalAddresses}{' '}
                        {totalAddresses === 1 ? 'address' : 'addresses'}
                        {missingCount > 0
                            ? `. ${missingCount} missing coordinates.`
                            : '.'}
                    </p>
                </div>

                <div className="rounded-sm border border-sidebar-border/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                        <div className="text-sm font-semibold">
                            Address list
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'active', label: 'Active' },
                                { id: 'do_not_call', label: 'Do not call' },
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
                            placeholder="Search address"
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
                            <Button
                                size="sm"
                                onClick={() => setScanDialogOpen(true)}
                                variant="outline"
                            >
                                Import scan
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setAddressDialogOpen(true)}
                            >
                                Add address
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
                                {statusOptions.map((option) => (
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
                        <DataTable className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Address</th>
                                    <th className="px-4 py-3">City</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Last visit</th>
                                    <th className="px-4 py-3">Next visit</th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAddresses.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                                        >
                                            No addresses found.
                                        </td>
                                    </tr>
                                )}
                                {paginatedAddresses.map((address) => (
                                    <tr
                                        key={address.id}
                                        className="border-t border-sidebar-border/70"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <Link
                                                href={showAddress(address.id)}
                                                className="underline-offset-4 transition hover:underline"
                                            >
                                                {[
                                                    address.civic_number,
                                                    address.street,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ') ||
                                                    address.label ||
                                                    'Unnamed address'}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            {address.city ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {address.do_not_call
                                                ? 'Do not call'
                                                : address.status}
                                        </td>
                                        <td className="px-4 py-3">
                                            {humanizeDate(address.last_visit_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {humanizeDate(address.next_visit_at)}
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
                                                        href={showAddress(
                                                            address.id,
                                                        )}
                                                    >
                                                        View address
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={editAddress(
                                                            address.id,
                                                        )}
                                                    >
                                                        Update address
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <a
                                                        href={`${showAddress.url(
                                                            address.id,
                                                        )}#log-visit`}
                                                    >
                                                        Log visit
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={destroyAddress(
                                                            address.id,
                                                        )}
                                                        method="delete"
                                                        as="button"
                                                        onClick={confirmDelete(
                                                            address.civic_number ||
                                                                address.street ||
                                                                address.label ||
                                                                'address',
                                                        )}
                                                    >
                                                        Delete address
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

            <AddressSearchDialog
                open={addressDialogOpen}
                onOpenChange={setAddressDialogOpen}
                territoryId={territory.id}
                statusOptions={statusOptions}
            />
            <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Import addresses from scan</DialogTitle>
                        <DialogDescription>
                            Upload a photo or scan, review the text, then
                            import.
                        </DialogDescription>
                    </DialogHeader>
                    <AddressScanImport
                        territoryId={territory.id}
                        statusOptions={statusOptions}
                        compact
                    />
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
