import { router } from '@inertiajs/react';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    bulk as bulkAddresses,
    store as storeAddress,
    streetLookup,
} from '@/routes/territories/addresses';

type Option = {
    label: string;
    value: string;
};

type GeoapifyFeature = {
    type: string;
    properties: {
        place_id?: string;
        osm_id?: number | string;
        formatted?: string;
        address_line1?: string;
        address_line2?: string;
        name?: string;
        housenumber?: string;
        street?: string;
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        hamlet?: string;
        county?: string;
        state?: string;
        state_code?: string;
        postcode?: string;
        country?: string;
        lat?: number;
        lon?: number;
    };
    bbox?: [number, number, number, number];
    geometry?: {
        coordinates?: [number, number];
    };
};

type StreetAddress = {
    id: string;
    civic_number: string | null;
    street: string | null;
    label: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
};

type StreetLookupAddress = {
    civic_number?: string | null;
    street?: string | null;
    label?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
};

const apiKey = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined;

const getFeatureId = (feature: GeoapifyFeature) => {
    return (
        feature.properties.place_id ??
        feature.properties.osm_id ??
        feature.properties.formatted ??
        `${feature.properties.lat ?? ''}-${feature.properties.lon ?? ''}`
    ).toString();
};

const pickCity = (properties: GeoapifyFeature['properties']) => {
    return (
        properties.city ??
        properties.town ??
        properties.village ??
        properties.suburb ??
        properties.hamlet ??
        properties.county ??
        null
    );
};

const pickRegion = (properties: GeoapifyFeature['properties']) => {
    return properties.state_code ?? properties.state ?? null;
};

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildStreetFromParts = (
    housenumber?: string | null,
    street?: string | null,
) => {
    return [housenumber, street].filter(Boolean).join(' ').trim();
};

const buildStreet = (properties: GeoapifyFeature['properties']) => {
    if (properties.street) {
        return properties.street;
    }

    if (properties.address_line1) {
        const line = properties.address_line1.trim();
        if (properties.housenumber) {
            const regex = new RegExp(
                `^${escapeRegExp(properties.housenumber)}\\s+`,
                'i',
            );
            return line.replace(regex, '').trim();
        }
        const match = /^(\d[\dA-Za-z\-]*)\s+(.+)$/.exec(line);
        if (match) {
            return match[2].trim();
        }
        return line;
    }

    if (properties.name) {
        return properties.name;
    }

    return '';
};

const normalizeText = (value: string) => {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
};

const toNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
};

const parseAddressLine = (value: string) => {
    const firstPart = value.split(',')[0]?.trim() ?? '';
    const match = /^(\d[\dA-Za-z\-]*)\s+(.+)$/.exec(firstPart);
    if (!match) {
        return null;
    }
    return {
        civicNumber: match[1],
        street: match[2].trim(),
    };
};

const getStreetName = (properties: GeoapifyFeature['properties']) => {
    return buildStreet(properties) || '';
};

const buildStreetLabel = (feature: GeoapifyFeature) => {
    const street = getStreetName(feature.properties) || feature.properties.formatted;
    const city = pickCity(feature.properties);
    const region = pickRegion(feature.properties);
    const location = [city, region].filter(Boolean).join(', ');
    return [street, location].filter(Boolean).join(' - ');
};

const buildAddressLabel = (properties: GeoapifyFeature['properties']) => {
    const line1 =
        properties.address_line1 ||
        buildStreetFromParts(properties.housenumber, buildStreet(properties));
    const line2 =
        properties.address_line2 ||
        [pickCity(properties), pickRegion(properties), properties.postcode]
            .filter(Boolean)
            .join(', ');
    return [line1, line2].filter(Boolean).join(' - ');
};

const featureToAddress = (feature: GeoapifyFeature): StreetAddress => {
    const properties = feature.properties;
    const lat = properties.lat ?? feature.geometry?.coordinates?.[1] ?? null;
    const lng = properties.lon ?? feature.geometry?.coordinates?.[0] ?? null;
    const fallbackLine =
        properties.address_line1 ??
        properties.formatted ??
        properties.name ??
        '';
    const parsed = fallbackLine ? parseAddressLine(fallbackLine) : null;
    const street = buildStreet(properties) || parsed?.street || null;
    const label =
        properties.formatted || properties.address_line1 || street || null;
    const civicNumber = properties.housenumber ?? parsed?.civicNumber ?? null;

    return {
        id: getFeatureId(feature),
        civic_number: civicNumber,
        street,
        label,
        city: pickCity(properties),
        region: pickRegion(properties),
        postal_code: properties.postcode ?? null,
        country: properties.country ?? null,
        lat: typeof lat === 'number' ? lat : null,
        lng: typeof lng === 'number' ? lng : null,
    };
};


export default function AddressSearchDialog({
    open,
    onOpenChange,
    territoryId,
    statusOptions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    territoryId: number;
    statusOptions: Option[];
}) {
    const [mode, setMode] = useState<'address' | 'street'>('address');
    const [status, setStatus] = useState(
        statusOptions[0]?.value ?? 'not_visited',
    );

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeoapifyFeature[]>([]);
    const [selected, setSelected] = useState<GeoapifyFeature | null>(null);
    const [selectedAddress, setSelectedAddress] =
        useState<StreetAddress | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [streetQuery, setStreetQuery] = useState('');
    const [streetResults, setStreetResults] = useState<GeoapifyFeature[]>([]);
    const [selectedStreet, setSelectedStreet] =
        useState<GeoapifyFeature | null>(null);
    const [streetAddresses, setStreetAddresses] =
        useState<StreetAddress[]>([]);
    const [selectedStreetAddressIds, setSelectedStreetAddressIds] =
        useState<string[]>([]);
    const [streetError, setStreetError] = useState<string | null>(null);
    const [streetSearchError, setStreetSearchError] = useState<string | null>(
        null,
    );
    const [isStreetSearching, setIsStreetSearching] = useState(false);
    const [isStreetLoading, setIsStreetLoading] = useState(false);
    const [isStreetImporting, setIsStreetImporting] = useState(false);
    const [streetLoaded, setStreetLoaded] = useState(false);
    const [streetLimitReached, setStreetLimitReached] = useState(false);

    const selectedStreetAddresses = useMemo(() => {
        return streetAddresses.filter((address) =>
            selectedStreetAddressIds.includes(address.id),
        );
    }, [streetAddresses, selectedStreetAddressIds]);

    useEffect(() => {
        if (!open) {
            setMode('address');
            setQuery('');
            setResults([]);
            setSelected(null);
            setSelectedAddress(null);
            setSearchError(null);
            setSaveError(null);
            setStreetQuery('');
            setStreetResults([]);
            setSelectedStreet(null);
            setStreetAddresses([]);
            setSelectedStreetAddressIds([]);
            setStreetError(null);
            setStreetSearchError(null);
            setStreetLoaded(false);
            setStreetLimitReached(false);
        }
    }, [open]);

    useEffect(() => {
        setSearchError(null);
        setSaveError(null);
        setSelected(null);
        setSelectedAddress(null);
        setResults([]);
        setIsSearching(false);
    }, [mode]);

    useEffect(() => {
        setStreetSearchError(null);
        setStreetError(null);
        setStreetResults([]);
        setSelectedStreet(null);
        setStreetAddresses([]);
        setSelectedStreetAddressIds([]);
        setIsStreetSearching(false);
        setStreetLoaded(false);
        setStreetLimitReached(false);
    }, [mode]);

    useEffect(() => {
        if (!open || mode !== 'address') {
            return;
        }

        if (!apiKey) {
            setSearchError('Missing Geoapify API key.');
            return;
        }

        const trimmed = query.trim();
        if (trimmed.length < 3) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        const controller = new AbortController();
        setIsSearching(true);
        setSearchError(null);

        const url = new URL(
            'https://api.geoapify.com/v1/geocode/autocomplete',
        );
        url.search = new URLSearchParams({
            text: trimmed,
            lang: 'en',
            limit: '8',
            apiKey,
        }).toString();

        fetch(url.toString(), { signal: controller.signal })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Search failed');
                }
                return response.json();
            })
            .then((data) => {
                const features = Array.isArray(data?.features)
                    ? data.features
                    : [];
                setResults(features);
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setSearchError(
                        'Unable to search addresses right now. Try again.',
                    );
                }
            })
            .finally(() => {
                setIsSearching(false);
            });

        return () => controller.abort();
    }, [query, mode, open]);

    useEffect(() => {
        if (!open || mode !== 'street') {
            return;
        }

        if (!apiKey) {
            setStreetSearchError('Missing Geoapify API key.');
            return;
        }

        const trimmed = streetQuery.trim();
        if (trimmed.length < 3) {
            setStreetResults([]);
            setIsStreetSearching(false);
            return;
        }

        const controller = new AbortController();
        setIsStreetSearching(true);
        setStreetSearchError(null);

        const url = new URL(
            'https://api.geoapify.com/v1/geocode/autocomplete',
        );
        url.search = new URLSearchParams({
            text: trimmed,
            type: 'street',
            lang: 'en',
            limit: '8',
            apiKey,
        }).toString();

        fetch(url.toString(), { signal: controller.signal })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Search failed');
                }
                return response.json();
            })
            .then((data) => {
                const features = Array.isArray(data?.features)
                    ? data.features
                    : [];
                setStreetResults(features);
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setStreetSearchError(
                        'Unable to search streets right now. Try again.',
                    );
                }
            })
            .finally(() => {
                setIsStreetSearching(false);
            });

        return () => controller.abort();
    }, [streetQuery, mode, open]);

    const handleAddressQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
    };

    const handleStreetQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
        setStreetQuery(event.target.value);
    };

    const handleSelectAddress = (feature: GeoapifyFeature) => {
        setSelected(feature);
        setSelectedAddress(featureToAddress(feature));
        setSaveError(null);
    };

    const handleSaveAddress = () => {
        if (!selectedAddress) {
            setSaveError('Select an address before saving.');
            return;
        }

        setIsSaving(true);
        setSaveError(null);

        router.post(
            storeAddress(territoryId).url,
            {
                civic_number: selectedAddress.civic_number,
                street: selectedAddress.street,
                label: selectedAddress.label,
                city: selectedAddress.city,
                region: selectedAddress.region,
                postal_code: selectedAddress.postal_code,
                country: selectedAddress.country,
                lat: selectedAddress.lat,
                lng: selectedAddress.lng,
                status,
            },
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onFinish: () => setIsSaving(false),
                onError: (errors) => {
                    setSaveError(
                        errors.civic_number ??
                            errors.street ??
                            errors.label ??
                            errors.status ??
                            'Save failed. Please try again.',
                    );
                },
            },
        );
    };

    const handleSelectStreet = (feature: GeoapifyFeature) => {
        setSelectedStreet(feature);
        setStreetAddresses([]);
        setSelectedStreetAddressIds([]);
        setStreetError(null);
        setStreetLoaded(false);
        setStreetLimitReached(false);
    };

    const handleLoadStreetAddresses = async () => {
        if (!selectedStreet) {
            setStreetError('Select a street first.');
            return;
        }
        const bbox = selectedStreet.bbox;
        if (!bbox || bbox.length !== 4) {
            setStreetError(
                'This street is missing a boundary. Try another result.',
            );
            return;
        }

        const streetName =
            getStreetName(selectedStreet.properties) || streetQuery.trim();
        if (!streetName) {
            setStreetError('Street name is missing. Try another result.');
            return;
        }

        setIsStreetLoading(true);
        setStreetError(null);
        setStreetLoaded(false);
        setStreetLimitReached(false);

        try {
            const [minLon, minLat, maxLon, maxLat] = bbox;
            const params = new URLSearchParams({
                street: streetName,
                min_lat: minLat.toString(),
                min_lng: minLon.toString(),
                max_lat: maxLat.toString(),
                max_lng: maxLon.toString(),
                store_street: '1',
            });
            const city = pickCity(selectedStreet.properties);
            const region = pickRegion(selectedStreet.properties);
            const country = selectedStreet.properties.country;
            if (city) {
                params.set('city', city);
            }
            if (region) {
                params.set('region', region);
            }
            if (country) {
                params.set('country', country);
            }

            const response = await fetch(
                `${streetLookup(territoryId).url}?${params.toString()}`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );
            const data = await response
                .json()
                .catch(() => null);
            if (!response.ok) {
                setStreetError(
                    (data && typeof data.error === 'string'
                        ? data.error
                        : null) ?? 'Unable to load street addresses. Try again.',
                );
                return;
            }
            const rows: StreetLookupAddress[] = Array.isArray(data?.addresses)
                ? data.addresses
                : [];

            const seen = new Map<string, StreetAddress>();

            rows.forEach((row, index) => {
                const civicNumber = row.civic_number ?? null;
                const street = row.street ?? null;
                if (!civicNumber || !street) {
                    return;
                }
                const key =
                    normalizeText(
                        `${civicNumber} ${street} ${row.postal_code ?? ''}`,
                    ) || `${index}-${civicNumber}`;
                if (seen.has(key)) {
                    return;
                }
                seen.set(key, {
                    id: key,
                    civic_number: civicNumber,
                    street,
                    label: row.label ?? null,
                    city: row.city ?? null,
                    region: row.region ?? null,
                    postal_code: row.postal_code ?? null,
                    country: row.country ?? null,
                    lat: toNumber(row.lat),
                    lng: toNumber(row.lng),
                });
            });

            const sorted = Array.from(seen.values()).sort((a, b) => {
                if (!a.civic_number || !b.civic_number) {
                    return 0;
                }
                const numA = parseInt(a.civic_number, 10);
                const numB = parseInt(b.civic_number, 10);
                if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
                    if (numA !== numB) {
                        return numA - numB;
                    }
                }
                return a.civic_number.localeCompare(b.civic_number);
            });
            const maxAddresses = 500;
            const limited = sorted.slice(0, maxAddresses);

            setStreetAddresses(limited);
            setSelectedStreetAddressIds(limited.map((row) => row.id));
            setStreetLimitReached(sorted.length > maxAddresses);
        } catch (error) {
            setStreetError('Unable to load street addresses. Try again.');
        } finally {
            setIsStreetLoading(false);
            setStreetLoaded(true);
        }
    };

    const handleToggleStreetAddress = (id: string) => {
        setSelectedStreetAddressIds((current) =>
            current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
        );
    };

    const handleSelectAllStreetAddresses = () => {
        setSelectedStreetAddressIds(
            streetAddresses.map((address) => address.id),
        );
    };

    const handleClearStreetAddresses = () => {
        setSelectedStreetAddressIds([]);
    };

    const handleImportStreetAddresses = () => {
        if (selectedStreetAddresses.length === 0) {
            setStreetError('Select at least one address to import.');
            return;
        }

        setIsStreetImporting(true);
        setStreetError(null);

        router.post(
            bulkAddresses(territoryId).url,
            {
                addresses: selectedStreetAddresses.map((address) => ({
                    civic_number: address.civic_number,
                    street: address.street,
                    label: address.label,
                    city: address.city,
                    region: address.region,
                    postal_code: address.postal_code,
                    country: address.country,
                    lat: address.lat,
                    lng: address.lng,
                })),
                status,
            },
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onFinish: () => setIsStreetImporting(false),
                onError: (errors) => {
                    setStreetError(
                        errors.addresses ??
                            errors.status ??
                            'Import failed. Please try again.',
                    );
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Add addresses</DialogTitle>
                    <DialogDescription>
                        Search a single address with Geoapify or import a
                        street from OpenStreetMap.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant={mode === 'address' ? 'default' : 'outline'}
                            onClick={() => setMode('address')}
                        >
                            Single address
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={mode === 'street' ? 'default' : 'outline'}
                            onClick={() => setMode('street')}
                        >
                            Street import
                        </Button>
                    </div>

                    {mode === 'address' ? (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="address-search">
                                    Search address
                                </Label>
                                <Input
                                    id="address-search"
                                    value={query}
                                    onChange={handleAddressQueryChange}
                                    placeholder="Start typing an address"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Type at least 3 characters to search.
                                </p>
                                <InputError message={searchError ?? undefined} />
                            </div>

                            <div className="rounded-sm border border-sidebar-border/70">
                                <div className="max-h-48 overflow-y-auto">
                                    {isSearching && (
                                        <p className="px-4 py-3 text-xs text-muted-foreground">
                                            Searching...
                                        </p>
                                    )}
                                    {!isSearching && results.length === 0 && (
                                        <p className="px-4 py-3 text-xs text-muted-foreground">
                                            No results yet.
                                        </p>
                                    )}
                                    {results.map((feature) => {
                                        const id = getFeatureId(feature);
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() =>
                                                    handleSelectAddress(feature)
                                                }
                                                className={`w-full border-t border-sidebar-border/70 px-4 py-2 text-left text-sm transition hover:bg-muted/40 ${
                                                    selected &&
                                                    getFeatureId(selected) === id
                                                        ? 'bg-muted/50'
                                                        : ''
                                                }`}
                                            >
                                                {buildAddressLabel(
                                                    feature.properties,
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedAddress && (
                                <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3 text-sm">
                                    <div className="text-xs uppercase text-muted-foreground">
                                        Selected address
                                    </div>
                                    <div className="font-medium">
                                        {buildStreetFromParts(
                                            selectedAddress.civic_number,
                                            selectedAddress.street,
                                        ) || selectedAddress.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {[
                                            selectedAddress.city,
                                            selectedAddress.region,
                                            selectedAddress.postal_code,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="address-status">Status</Label>
                                <select
                                    id="address-status"
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    {statusOptions.length === 0 && (
                                        <option value="not_visited">
                                            Not visited
                                        </option>
                                    )}
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

                            <InputError message={saveError ?? undefined} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="street-search">
                                    Search street
                                </Label>
                                <Input
                                    id="street-search"
                                    value={streetQuery}
                                    onChange={handleStreetQueryChange}
                                    placeholder="Start typing a street name"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Type at least 3 characters to search.
                                </p>
                                <InputError
                                    message={streetSearchError ?? undefined}
                                />
                            </div>

                            <div className="rounded-sm border border-sidebar-border/70">
                                <div className="max-h-40 overflow-y-auto">
                                    {isStreetSearching && (
                                        <p className="px-4 py-3 text-xs text-muted-foreground">
                                            Searching...
                                        </p>
                                    )}
                                    {!isStreetSearching &&
                                        streetResults.length === 0 && (
                                            <p className="px-4 py-3 text-xs text-muted-foreground">
                                                No results yet.
                                            </p>
                                        )}
                                    {streetResults.map((feature) => {
                                        const id = getFeatureId(feature);
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() =>
                                                    handleSelectStreet(feature)
                                                }
                                                className={`w-full border-t border-sidebar-border/70 px-4 py-2 text-left text-sm transition hover:bg-muted/40 ${
                                                    selectedStreet &&
                                                    getFeatureId(
                                                        selectedStreet,
                                                    ) === id
                                                        ? 'bg-muted/50'
                                                        : ''
                                                }`}
                                            >
                                                {buildStreetLabel(feature)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedStreet && (
                                <div className="rounded-sm border border-sidebar-border/70 bg-muted/20 p-3 text-sm">
                                    <div className="text-xs uppercase text-muted-foreground">
                                        Selected street
                                    </div>
                                    <div className="font-medium">
                                        {buildStreetLabel(selectedStreet)}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleLoadStreetAddresses}
                                    disabled={
                                        isStreetLoading || !selectedStreet
                                    }
                                >
                                    {isStreetLoading
                                        ? 'Loading addresses...'
                                        : 'Load addresses'}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    OpenStreetMap returns addresses in the
                                    street area. Results may be incomplete.
                                </p>
                            </div>

                            {streetAddresses.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span>
                                            {streetAddresses.length} addresses
                                            found. {selectedStreetAddresses.length}{' '}
                                            selected.
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={
                                                    handleSelectAllStreetAddresses
                                                }
                                            >
                                                Select all
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={
                                                    handleClearStreetAddresses
                                                }
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    {streetLimitReached && (
                                        <p className="text-xs text-muted-foreground">
                                            Showing the first 500 addresses.
                                        </p>
                                    )}

                                    <div className="max-h-64 overflow-y-auto rounded-sm border border-sidebar-border/70">
                                        {streetAddresses.map((address) => {
                                            const checked =
                                                selectedStreetAddressIds.includes(
                                                    address.id,
                                                );
                                            return (
                                                <label
                                                    key={address.id}
                                                    className="flex items-start gap-3 border-t border-sidebar-border/70 px-4 py-3 text-sm"
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        onCheckedChange={() =>
                                                            handleToggleStreetAddress(
                                                                address.id,
                                                            )
                                                        }
                                                    />
                                                    <div>
                                                        <div className="font-medium">
                                                            {buildStreetFromParts(
                                                                address.civic_number,
                                                                address.street,
                                                            ) || address.label}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {[
                                                                address.city,
                                                                address.region,
                                                                address.postal_code,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(', ')}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {streetLoaded &&
                                !isStreetLoading &&
                                streetAddresses.length === 0 &&
                                !streetError && (
                                    <p className="text-xs text-muted-foreground">
                                        No addresses found for this street. Try
                                        another result or use scan import.
                                    </p>
                                )}

                            <div className="grid gap-2">
                                <Label htmlFor="street-status">Status</Label>
                                <select
                                    id="street-status"
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                                >
                                    {statusOptions.length === 0 && (
                                        <option value="not_visited">
                                            Not visited
                                        </option>
                                    )}
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

                            <InputError message={streetError ?? undefined} />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    {mode === 'address' ? (
                        <Button
                            type="button"
                            onClick={handleSaveAddress}
                            disabled={!selectedAddress || isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save address'}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleImportStreetAddresses}
                            disabled={
                                selectedStreetAddresses.length === 0 ||
                                isStreetImporting
                            }
                        >
                            {isStreetImporting
                                ? 'Importing...'
                                : 'Import selected'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
