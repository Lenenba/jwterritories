import AppLayout from '@/layouts/app-layout';
import { edit, index, update } from '@/routes/assignments';
import { type BreadcrumbItem } from '@/types';
import { Form, Head, Link } from '@inertiajs/react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Assignment = {
    id: number;
    territory_id: number;
    assignee_user_id?: number | null;
    start_at: string;
    due_at: string;
    returned_at?: string | null;
    status: string;
    notes?: string | null;
};

type TerritoryOption = {
    id: number;
    code: string;
    name: string;
};

type AssigneeOption = {
    id: number;
    name: string;
};

const statusOptions = ['active', 'returned', 'extended', 'overdue'];

const formatDate = (value?: string | null) => {
    if (!value) {
        return '';
    }
    return value.slice(0, 10);
};

export default function AssignmentEdit({
    assignment,
    territories,
    assignees,
}: {
    assignment: Assignment;
    territories: TerritoryOption[];
    assignees: AssigneeOption[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Assignments',
            href: index().url,
        },
        {
            title: 'Edit',
            href: edit(assignment.id).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit assignment" />

            <div className="flex max-w-3xl flex-col gap-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Edit assignment
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Update assignment dates, assignee, and status.
                    </p>
                </div>

                <Form {...update.form(assignment.id)} className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="territory_id">
                                    Territory
                                </Label>
                                <select
                                    id="territory_id"
                                    name="territory_id"
                                    className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                    defaultValue={assignment.territory_id}
                                    required
                                >
                                    {territories.map((territory) => (
                                        <option
                                            key={territory.id}
                                            value={territory.id}
                                        >
                                            {territory.code} - {territory.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.territory_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="assignee_user_id">
                                    Assignee
                                </Label>
                                <select
                                    id="assignee_user_id"
                                    name="assignee_user_id"
                                    className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                    defaultValue={
                                        assignment.assignee_user_id ?? ''
                                    }
                                >
                                    <option value="">Unassigned</option>
                                    {assignees.map((assignee) => (
                                        <option
                                            key={assignee.id}
                                            value={assignee.id}
                                        >
                                            {assignee.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError
                                    message={errors.assignee_user_id}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_at">
                                        Start date
                                    </Label>
                                    <Input
                                        id="start_at"
                                        name="start_at"
                                        type="date"
                                        defaultValue={formatDate(
                                            assignment.start_at,
                                        )}
                                        required
                                    />
                                    <InputError message={errors.start_at} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="due_at">Due date</Label>
                                    <Input
                                        id="due_at"
                                        name="due_at"
                                        type="date"
                                        defaultValue={formatDate(
                                            assignment.due_at,
                                        )}
                                        required
                                    />
                                    <InputError message={errors.due_at} />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        name="status"
                                        className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                        defaultValue={assignment.status}
                                    >
                                        {statusOptions.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.status} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="returned_at">
                                        Returned date
                                    </Label>
                                    <Input
                                        id="returned_at"
                                        name="returned_at"
                                        type="date"
                                        defaultValue={formatDate(
                                            assignment.returned_at,
                                        )}
                                    />
                                    <InputError message={errors.returned_at} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                                    defaultValue={assignment.notes ?? ''}
                                    placeholder="Team, constraints..."
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing} type="submit">
                                    Save changes
                                </Button>
                                <Button asChild variant="ghost">
                                    <Link href={index()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
