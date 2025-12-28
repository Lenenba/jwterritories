import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';

type TerritoryStreet = {
    id: number;
    name: string;
    geojson: unknown;
};

type TerritoryMapData = {
    id: number;
    code: string;
    name: string;
    streets?: TerritoryStreet[];
};

const streetColors = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#f59e0b',
    '#7c3aed',
    '#0f766e',
    '#db2777',
    '#4f46e5',
];

const getTerritoryColor = (territoryId: number) => {
    const index = Math.abs(territoryId) % streetColors.length;
    return streetColors[index];
};

export default function OrganizationMap({
    territories,
}: {
    territories: TerritoryMapData[];
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const streetsRef = useRef<L.LayerGroup | null>(null);

    const streetGroups = useMemo(() => {
        return territories
            .map((territory) => ({
                territory,
                streets: territory.streets ?? [],
            }))
            .filter((group) => group.streets.length > 0);
    }, [territories]);

    const hasStreets = streetGroups.some(
        (group) => group.streets.length > 0,
    );

    useEffect(() => {
        if (!containerRef.current || mapRef.current || !hasStreets) {
            return;
        }

        const map = L.map(containerRef.current, {
            scrollWheelZoom: false,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapRef.current = map;
        streetsRef.current = L.layerGroup().addTo(map);
    }, [hasStreets]);

    useEffect(() => {
        if (!mapRef.current || !streetsRef.current) {
            return;
        }

        streetsRef.current.clearLayers();

        streetGroups.forEach(({ territory, streets }) => {
            const color = getTerritoryColor(territory.id);
            streets.forEach((street) => {
                if (!street.geojson) {
                    return;
                }
                L.geoJSON(street.geojson as any, {
                    style: {
                        color,
                        weight: 3,
                        opacity: 0.9,
                    },
                }).addTo(streetsRef.current as L.LayerGroup);
            });
        });

        const bounds = L.latLngBounds([]);
        streetsRef.current.eachLayer((layer) => {
            if (typeof (layer as L.GeoJSON).getBounds === 'function') {
                const layerBounds = (layer as L.GeoJSON).getBounds();
                if (layerBounds.isValid()) {
                    bounds.extend(layerBounds);
                }
            }
        });

        if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
        }
    }, [streetGroups]);

    useEffect(() => {
        if (hasStreets) {
            return;
        }
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            streetsRef.current = null;
        }
    }, [hasStreets]);

    useEffect(() => {
        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            streetsRef.current = null;
        };
    }, []);

    if (!hasStreets) {
        return (
            <div className="flex h-[360px] items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm text-muted-foreground">
                Add streets to territories to see the organization map.
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative z-0 h-[360px] w-full rounded-sm border"
        />
    );
}
