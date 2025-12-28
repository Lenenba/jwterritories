import AppLayout from '@/layouts/app-layout';
import { destroy, edit, index, show as showTerritory, store } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { type MouseEvent, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';

import InputError from '@/components/input-error';
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
import { Label } from '@/components/ui/label';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

type ParentTerritory = {
    id: number;
    code: string;
    name: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Territories',
        href: index().url,
    },
    {
        title: 'Create',
        href: '',
    },
];

export default function TerritoryCreate({
    parents,
}: {
    parents: ParentTerritory[];
}) {
    const [tab, setTab] = useState<'all' | 'parents'>('all');
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

    const filteredParents = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return parents;
        }
        return parents.filter((parent) =>
            [parent.code, parent.name]
                .join(' ')
                .toLowerCase()
                .includes(normalizedQuery),
        );
    }, [parents, query]);

    const pagination = useDataTablePagination(filteredParents);
    const paginatedParents = pagination.paginatedItems;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create territory" />

            <div className="flex max-w-3xl flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">New territory</h1>
                    <p className="text-sm text-muted-foreground">
                        Create a new small territory and optionally attach its
                        map scan.
                    </p>
                </div>

                <Form
                    {...store.form()}
                    encType="multipart/form-data"
                    className="space-y-6"
                    id="territory-form"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Code</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        required
                                        placeholder="T-280"
                                    />
                                    <InputError message={errors.code} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        placeholder="Territory 280"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="territory_type">
                                        Territory type
                                    </Label>
                                    <Input
                                        id="territory_type"
                                        name="territory_type"
                                        placeholder="Apartment, Rural, Campus..."
                                    />
                                    <InputError
                                        message={errors.territory_type}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="dominant_language">
                                        Dominant language
                                    </Label>
                                    <Input
                                        id="dominant_language"
                                        name="dominant_language"
                                        placeholder="Francophone, Anglophone..."
                                    />
                                    <InputError
                                        message={errors.dominant_language}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="parent_id">
                                    Parent territory (optional)
                                </Label>
                                <select
                                    id="parent_id"
                                    name="parent_id"
                                    className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    <option value="">None</option>
                                    {parents.map((parent) => (
                                        <option
                                            key={parent.id}
                                            value={parent.id}
                                        >
                                            {parent.code} - {parent.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.parent_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={4}
                                    className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                    placeholder="Access notes, visit tips, landmarks..."
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="map_image">
                                    Map scan (optional)
                                </Label>
                                <Input
                                    id="map_image"
                                    name="map_image"
                                    type="file"
                                    accept="image/*"
                                />
                                <InputError message={errors.map_image} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing} type="submit">
                                    Create territory
                                </Button>
                                <Button asChild variant="ghost">
                                    <Link href={index()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Parent territories
                        </div>
                        <div className="text-xl font-semibold">
                            {parents.length}
                        </div>
                    </div>
                    <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                        <div className="text-xs uppercase text-muted-foreground">
                            Filtered
                        </div>
                        <div className="text-xl font-semibold">
                            {filteredParents.length}
                        </div>
                    </div>
                </div>

                <div className="rounded-sm border border-sidebar-border/70">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                        <div className="text-sm font-semibold">
                            Parent territories
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'parents', label: 'Top-level' },
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
                            placeholder="Search parent territories"
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
                                <a href="#territory-form">Add territory</a>
                            </Button>
                        </div>
                    </div>

                    {filtersOpen && (
                        <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-sm text-muted-foreground">
                            No extra filters for parent territories.
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <DataTable className="w-full text-sm">
                            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                {filteredParents.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="px-4 py-6 text-center text-sm text-muted-foreground"
                                            >
                                                No parent territories found.
                                            </td>
                                    </tr>
                                )}
                                {paginatedParents.map((parent) => (
                                    <tr
                                        key={parent.id}
                                        className="border-t border-sidebar-border/70"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {parent.code}
                                        </td>
                                        <td className="px-4 py-3">
                                            {parent.name}
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
                                                                parent.id,
                                                            )}
                                                        >
                                                            View territory
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={edit(
                                                                parent.id,
                                                            )}
                                                        >
                                                            Update territory
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={destroy(
                                                                parent.id,
                                                            )}
                                                            method="delete"
                                                            as="button"
                                                            onClick={confirmDelete(
                                                                parent.code,
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
