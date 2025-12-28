type DateInput = string | number | Date | null | undefined;

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: 'year', seconds: 60 * 60 * 24 * 365 },
    { unit: 'month', seconds: 60 * 60 * 24 * 30 },
    { unit: 'week', seconds: 60 * 60 * 24 * 7 },
    { unit: 'day', seconds: 60 * 60 * 24 },
    { unit: 'hour', seconds: 60 * 60 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
];

export function parseDate(value: DateInput): Date | null {
    if (!value) {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}

export function humanizeDate(value: DateInput): string {
    const date = parseDate(value);
    if (!date) {
        return '—';
    }

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    for (const unit of units) {
        if (absSeconds >= unit.seconds || unit.unit === 'second') {
            const amount = Math.round(diffSeconds / unit.seconds);
            return rtf.format(amount, unit.unit);
        }
    }

    return rtf.format(0, 'second');
}

export function isWithinDays(value: DateInput, days: number): boolean {
    const date = parseDate(value);
    if (!date) {
        return false;
    }
    const diffMs = Date.now() - date.getTime();
    return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}
