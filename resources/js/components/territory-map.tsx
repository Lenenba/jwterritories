import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type MapAddress = {
    id: number;
    civic_number?: string | null;
    label?: string | null;
    street?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    status: string;
    do_not_call: boolean;
};

type MapStreet = {
    id: number;
    name: string;
    geojson: unknown;
};

const buildAddressLabel = (address: MapAddress) => {
    const streetLine = [address.civic_number, address.street]
        .filter(Boolean)
        .join(' ');
    return streetLine || address.label || `Address #${address.id}`;
};

const resolveAssetUrl = (asset: string | { default: string }) => {
    return typeof asset === 'string' ? asset : asset.default;
};

const defaultMarkerIcon = L.icon({
    iconRetinaUrl: resolveAssetUrl(markerIcon2x),
    iconUrl: resolveAssetUrl(markerIcon),
    shadowUrl: resolveAssetUrl(markerShadow),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    tooltipAnchor: [16, -28],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

export default function TerritoryMap({
    addresses,
    streets = [],
}: {
    addresses: MapAddress[];
    streets?: MapStreet[];
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const streetsRef = useRef<L.LayerGroup | null>(null);

    const points = useMemo(
        () =>
            addresses
                .filter(
                    (address) =>
                        typeof address.lat === 'number' &&
                        typeof address.lng === 'number',
                )
                .map((address) => ({
                    id: address.id,
                    lat: address.lat as number,
                    lng: address.lng as number,
                    label: buildAddressLabel(address),
                })),
        [addresses],
    );

    const streetGeojson = useMemo(
        () => streets.map((street) => street.geojson).filter(Boolean),
        [streets],
    );

    const hasMapData = points.length > 0 || streetGeojson.length > 0;

    useEffect(() => {
        if (!containerRef.current || mapRef.current || !hasMapData) {
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
        markersRef.current = L.layerGroup().addTo(map);
        streetsRef.current = L.layerGroup().addTo(map);
    }, [hasMapData]);

    useEffect(() => {
        if (!mapRef.current || !markersRef.current || !streetsRef.current) {
            return;
        }

        markersRef.current.clearLayers();
        streetsRef.current.clearLayers();

        streetGeojson.forEach((geojson) => {
            L.geoJSON(geojson as any, {
                style: {
                    color: '#facc15',
                    weight: 4,
                    opacity: 0.9,
                },
            }).addTo(streetsRef.current as L.LayerGroup);
        });

        points.forEach((point) => {
            const marker = L.marker([point.lat, point.lng], {
                icon: defaultMarkerIcon,
            }).addTo(markersRef.current as L.LayerGroup);
            marker.bindTooltip(point.label, { direction: 'top', offset: [0, -8] });
        });

        const bounds = L.latLngBounds([]);

        points.forEach((point) => {
            bounds.extend([point.lat, point.lng]);
        });

        streetsRef.current.eachLayer((layer) => {
            if (typeof (layer as L.GeoJSON).getBounds === 'function') {
                const layerBounds = (layer as L.GeoJSON).getBounds();
                if (layerBounds.isValid()) {
                    bounds.extend(layerBounds);
                }
            }
        });

        if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
        }
    }, [points, streetGeojson]);

    useEffect(() => {
        if (hasMapData) {
            return;
        }
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markersRef.current = null;
            streetsRef.current = null;
        }
    }, [hasMapData]);

    useEffect(() => {
        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            markersRef.current = null;
            streetsRef.current = null;
        };
    }, []);

    if (!hasMapData) {
        return (
            <div className="flex h-[360px] items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm text-muted-foreground">
                Add streets or coordinates to see the map.
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
