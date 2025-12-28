import AppLayout from '@/layouts/app-layout';
import { show as showAddress } from '@/routes/addresses';
import { edit, update } from '@/routes/addresses/visits';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AddressSummary = {
    id: number;
    label?: string | null;
    street?: string | null;
    civic_number?: string | null;
    next_visit_at?: string | null;
    territory?: { id: number; code: string; name: string } | null;
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
};

type Option = {
    label: string;
    value: string;
};

const formatDate = (value?: string | null) => {
    if (!value) {
        return '';
    }
    return value.slice(0, 10);
};

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function VisitEdit({
    address,
    visit,
    resultOptions,
    actionOptions,
}: {
    address: AddressSummary;
    visit: Visit;
    resultOptions: Option[];
    actionOptions: Option[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Address',
            href: showAddress(address.id).url,
        },
        {
            title: 'Edit visit',
            href: edit({ address: address.id, visit: visit.id }).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit visit" />

            <div className="flex max-w-3xl flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit visit</h1>
                    <p className="text-sm text-muted-foreground">
                        Update visit details for{' '}
                        {[address.civic_number, address.street, address.label]
                            .filter(Boolean)
                            .join(' ') || 'this address'}
                        .
                    </p>
                </div>

                <Form
                    {...update.form({ address: address.id, visit: visit.id })}
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
                                    defaultValue={formatDateTime(
                                        visit.visited_at,
                                    )}
                                    required
                                />
                                <InputError message={errors.visited_at} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="result">Result</Label>
                                <select
                                    id="result"
                                    name="result"
                                    className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                    defaultValue={visit.result}
                                >
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
                                    defaultValue={visit.action ?? 'none'}
                                >
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
                                <Label htmlFor="openness">Openness</Label>
                                <Input
                                    id="openness"
                                    name="openness"
                                    defaultValue={visit.openness ?? ''}
                                />
                                <InputError message={errors.openness} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="observed_language">
                                    Observed language
                                </Label>
                                <Input
                                    id="observed_language"
                                    name="observed_language"
                                    defaultValue={visit.observed_language ?? ''}
                                />
                                <InputError
                                    message={errors.observed_language}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="person_name">Person name</Label>
                                <Input
                                    id="person_name"
                                    name="person_name"
                                    defaultValue={visit.person_name ?? ''}
                                />
                                <InputError message={errors.person_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                    defaultValue={visit.notes ?? ''}
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
                                    defaultValue={formatDate(
                                        address.next_visit_at ?? null,
                                    )}
                                />
                                <InputError message={errors.next_visit_at} />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    name="do_not_call"
                                    defaultChecked={visit.do_not_call}
                                    className="size-4 rounded-sm border border-input"
                                />
                                Do not call
                            </label>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing} type="submit">
                                    Save changes
                                </Button>
                                <Button asChild variant="ghost">
                                    <Link href={showAddress(address.id)}>
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
