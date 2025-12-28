import AppLayout from '@/layouts/app-layout';
import { index, show, update } from '@/routes/territories';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ParentTerritory = {
    id: number;
    code: string;
    name: string;
};

type Territory = {
    id: number;
    parent_id?: number | null;
    code: string;
    name: string;
    territory_type?: string | null;
    dominant_language?: string | null;
    notes?: string | null;
    map_image_url?: string | null;
};

export default function TerritoryEdit({
    territory,
    parents,
}: {
    territory: Territory;
    parents: ParentTerritory[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Territories',
            href: index().url,
        },
        {
            title: territory.code,
            href: show(territory.id).url,
        },
        {
            title: 'Edit',
            href: '',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${territory.code}`} />

            <div className="flex max-w-3xl flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Edit territory {territory.code}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Update the details for this territory.
                    </p>
                </div>

                <Form
                    {...update.form(territory.id)}
                    encType="multipart/form-data"
                    className="space-y-6"
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
                                        defaultValue={territory.code}
                                    />
                                    <InputError message={errors.code} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        defaultValue={territory.name}
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
                                        defaultValue={
                                            territory.territory_type ?? ''
                                        }
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
                                        defaultValue={
                                            territory.dominant_language ?? ''
                                        }
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
                                    defaultValue={territory.parent_id ?? ''}
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
                                    defaultValue={territory.notes ?? ''}
                                    placeholder="Access notes, visit tips, landmarks..."
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="map_image">
                                    Map scan (optional)
                                </Label>
                                {territory.map_image_url && (
                                    <img
                                        src={territory.map_image_url}
                                        alt={`Map for ${territory.code}`}
                                        className="w-full rounded-sm border"
                                    />
                                )}
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
                                    Save changes
                                </Button>
                                <Button asChild variant="ghost">
                                    <Link href={show(territory.id)}>
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
