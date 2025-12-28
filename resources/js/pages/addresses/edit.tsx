import AppLayout from '@/layouts/app-layout';
import { show as showAddress, update } from '@/routes/addresses';
import { index as territoriesIndex, show as showTerritory } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    lat?: string | null;
    lng?: string | null;
    status: string;
    do_not_call: boolean;
    next_visit_at?: string | null;
    territory: { id: number; code: string; name: string };
};

type Option = {
    label: string;
    value: string;
};

export default function AddressEdit({
    address,
    statusOptions,
}: {
    address: Address;
    statusOptions: Option[];
}) {
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
            href: showAddress(address.id).url,
        },
        {
            title: 'Edit',
            href: '',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit address" />

            <div className="flex max-w-3xl flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit address</h1>
                    <p className="text-sm text-muted-foreground">
                        Update contact details and address status.
                    </p>
                </div>

                <Form {...update.form(address.id)} className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="civic_number">
                                        Civic number
                                    </Label>
                                    <Input
                                        id="civic_number"
                                        name="civic_number"
                                        defaultValue={
                                            address.civic_number ?? ''
                                        }
                                    />
                                    <InputError
                                        message={errors.civic_number}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="unit">Unit</Label>
                                    <Input
                                        id="unit"
                                        name="unit"
                                        defaultValue={address.unit ?? ''}
                                    />
                                    <InputError message={errors.unit} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="label">Label</Label>
                                    <Input
                                        id="label"
                                        name="label"
                                        defaultValue={address.label ?? ''}
                                        placeholder="Apt 3B, Main entrance..."
                                    />
                                    <InputError message={errors.label} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="contact_name">
                                        Contact name
                                    </Label>
                                    <Input
                                        id="contact_name"
                                        name="contact_name"
                                        defaultValue={address.contact_name ?? ''}
                                    />
                                    <InputError
                                        message={errors.contact_name}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="street">
                                        Street address
                                    </Label>
                                    <Input
                                        id="street"
                                        name="street"
                                        defaultValue={address.street ?? ''}
                                    />
                                    <InputError message={errors.street} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="street2">
                                        Address line 2
                                    </Label>
                                    <Input
                                        id="street2"
                                        name="street2"
                                        defaultValue={address.street2 ?? ''}
                                    />
                                    <InputError message={errors.street2} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        defaultValue={address.city ?? ''}
                                    />
                                    <InputError message={errors.city} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="region">Region</Label>
                                    <Input
                                        id="region"
                                        name="region"
                                        defaultValue={address.region ?? ''}
                                    />
                                    <InputError message={errors.region} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="postal_code">
                                        Postal code
                                    </Label>
                                    <Input
                                        id="postal_code"
                                        name="postal_code"
                                        defaultValue={
                                            address.postal_code ?? ''
                                        }
                                    />
                                    <InputError
                                        message={errors.postal_code}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        name="country"
                                        defaultValue={address.country ?? ''}
                                    />
                                    <InputError message={errors.country} />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        defaultValue={address.phone ?? ''}
                                    />
                                    <InputError message={errors.phone} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        name="status"
                                        className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                        defaultValue={address.status}
                                    >
                                        {statusOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.status} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="next_visit_at">
                                    Next visit date
                                </Label>
                                <Input
                                    id="next_visit_at"
                                    name="next_visit_at"
                                    type="date"
                                    defaultValue={
                                        address.next_visit_at?.slice(0, 10) ??
                                        ''
                                    }
                                />
                                <InputError message={errors.next_visit_at} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                    defaultValue={address.notes ?? ''}
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    name="do_not_call"
                                    defaultChecked={address.do_not_call}
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
