import { destroy, store } from '@/routes/options';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';
import { type MouseEvent, useEffect, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';

import HeadingSmall from '@/components/heading-small';
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
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/options';
import { useDataTablePagination } from '@/hooks/use-data-table-pagination';

type Option = {
    id: number;
    label: string;
    value: string;
    sort: number;
    is_active: boolean;
};

type OptionsByList = {
    address_status: Option[];
    visit_result: Option[];
    visit_action: Option[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Options',
        href: edit().url,
    },
];

const lists = [
    {
        key: 'address_status',
        title: 'Address status',
        description: 'Controls the current status stored on each address.',
    },
    {
        key: 'visit_result',
        title: 'Visit result',
        description: 'Result values recorded for each visit.',
    },
    {
        key: 'visit_action',
        title: 'Visit action',
        description: 'Optional follow-up action recorded per visit.',
    },
] as const;

export default function Options({ options }: { options: OptionsByList }) {
    const [tab, setTab] = useState<keyof OptionsByList>('address_status');
    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState<Option | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const currentOptions = options[tab] ?? [];

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) {
            return currentOptions;
        }
        return currentOptions.filter((option) =>
            [option.label, option.value]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedQuery),
        );
    }, [currentOptions, query]);

    const pagination = useDataTablePagination(filteredOptions);
    const paginatedOptions = pagination.paginatedItems;

    const totalCount = currentOptions.length;
    const activeCount = currentOptions.filter((option) => option.is_active)
        .length;

    const clearFilters = () => {
        setQuery('');
    };

    const confirmDelete = (label: string) => (event: MouseEvent) => {
        if (!confirm(`Delete ${label}?`)) {
            event.preventDefault();
        }
    };

    useEffect(() => {
        setDraft(null);
        setFormKey((value) => value + 1);
    }, [tab]);

    const startEdit = (option: Option) => {
        setDraft(option);
        setFormKey((value) => value + 1);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Options" />

            <SettingsLayout>
                <div className="space-y-8">
                    <HeadingSmall
                        title="Organization options"
                        description="Customize the status and result lists used in the app."
                    />

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3">
                            <div className="text-xs uppercase text-muted-foreground">
                                Options in list
                            </div>
                            <div className="text-xl font-semibold">
                                {totalCount}
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
                                Lists
                            </div>
                            <div className="text-xl font-semibold">
                                {lists.length}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-sm border border-sidebar-border/70">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sidebar-border/70 px-4 py-3">
                            <div className="text-sm font-semibold">
                                Option lists
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {lists.map((list) => (
                                    <Button
                                        key={list.key}
                                        variant={
                                            tab === list.key
                                                ? 'default'
                                                : 'ghost'
                                        }
                                        size="sm"
                                        onClick={() =>
                                            setTab(list.key as typeof tab)
                                        }
                                    >
                                        {list.title}
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
                                placeholder="Filter options"
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
                                    <a
                                        href="#add-option"
                                        onClick={() => setDraft(null)}
                                    >
                                        Add option
                                    </a>
                                </Button>
                            </div>
                        </div>

                        {filtersOpen && (
                            <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border/70 px-4 py-3 text-xs text-muted-foreground">
                                {lists.find((list) => list.key === tab)
                                    ?.description ?? ''}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <DataTable className="w-full text-sm">
                                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Label</th>
                                        <th className="px-4 py-3">Value</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOptions.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-6 text-center text-sm text-muted-foreground"
                                            >
                                                No options found.
                                            </td>
                                        </tr>
                                    )}
                                    {paginatedOptions.map((option) => (
                                        <tr
                                            key={option.id}
                                            className="border-t border-sidebar-border/70"
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {option.label}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {option.value}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {option.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
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
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            startEdit(
                                                                option,
                                                            )
                                                        }
                                                    >
                                                        Edit option
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={destroy(
                                                                option.id,
                                                            )}
                                                            method="delete"
                                                            as="button"
                                                            onClick={confirmDelete(
                                                                option.label,
                                                            )}
                                                        >
                                                            Delete option
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

                    <div
                        id="add-option"
                        className="rounded-sm border border-sidebar-border/70 p-4"
                    >
                        <HeadingSmall
                            title={
                                draft ? 'Update option' : 'Add an option'
                            }
                            description="Create or update labels for the selected list."
                        />
                        <Form
                            {...store.form()}
                            key={formKey}
                            className="mt-4 space-y-3"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {draft && (
                                        <div className="text-xs text-muted-foreground">
                                            Editing: {draft.label}
                                        </div>
                                    )}
                                    <input
                                        type="hidden"
                                        name="list_key"
                                        value={tab}
                                    />
                                    <div className="grid gap-2">
                                        <Label htmlFor="label">Label</Label>
                                        <Input
                                            id="label"
                                            name="label"
                                            placeholder="Label shown in the app"
                                            defaultValue={draft?.label ?? ''}
                                        />
                                        <InputError message={errors.label} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="value">
                                            Value (optional)
                                        </Label>
                                        <Input
                                            id="value"
                                            name="value"
                                            placeholder="auto-generated"
                                            defaultValue={draft?.value ?? ''}
                                        />
                                        <InputError message={errors.value} />
                                    </div>

                                    <Button
                                        disabled={processing}
                                        type="submit"
                                    >
                                        {draft ? 'Save option' : 'Add option'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
