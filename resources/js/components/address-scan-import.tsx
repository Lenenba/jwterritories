import { router } from '@inertiajs/react';
import { type ChangeEvent, useMemo, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { importScan } from '@/routes/territories/addresses';

type Option = {
    label: string;
    value: string;
};

type TesseractWorker = import('tesseract.js').Worker;

const emptyDefaults = {
    city: '',
    region: '',
    postal_code: '',
    country: '',
};

const normalizeValue = (value: string) => {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
};

export default function AddressScanImport({
    territoryId,
    statusOptions,
    compact = false,
}: {
    territoryId: number;
    statusOptions: Option[];
    compact?: boolean;
}) {
    const [scanFile, setScanFile] = useState<File | null>(null);
    const [scanStatus, setScanStatus] = useState<
        'idle' | 'processing' | 'ready'
    >('idle');
    const [scanProgress, setScanProgress] = useState<number | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [defaults, setDefaults] = useState(emptyDefaults);
    const [status, setStatus] = useState(
        statusOptions[0]?.value ?? 'not_visited',
    );
    const [language, setLanguage] = useState('eng');
    const [isImporting, setIsImporting] = useState(false);

    const lineStats = useMemo(() => {
        const lines = ocrText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const withNumbers = lines.filter((line) => /\d/.test(line));
        return {
            total: lines.length,
            candidates: withNumbers.length,
        };
    }, [ocrText]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setScanFile(file);
        setScanStatus('idle');
        setScanProgress(null);
        setScanError(null);
        setImportError(null);
        if (file) {
            setOcrText('');
        }
    };

    const handleScan = async () => {
        if (!scanFile) {
            setScanError('Select an image before scanning.');
            return;
        }

        setScanStatus('processing');
        setScanProgress(0);
        setScanError(null);
        setImportError(null);

        let worker: TesseractWorker | null = null;

        try {
            const { createWorker } = await import('tesseract.js');
            worker = await createWorker({
                logger: (message) => {
                    if (message.status === 'recognizing text') {
                        setScanProgress(
                            Math.round(message.progress * 100),
                        );
                    }
                },
            });

            await worker.loadLanguage(language);
            await worker.initialize(language);
            const { data } = await worker.recognize(scanFile);
            setOcrText((data?.text ?? '').trim());
            setScanStatus('ready');
        } catch (error) {
            setScanStatus('idle');
            setScanError(
                'Scan failed. Try a clearer photo or a different language.',
            );
        } finally {
            setScanProgress(null);
            if (worker) {
                await worker.terminate();
            }
        }
    };

    const handleImport = () => {
        if (!ocrText.trim()) {
            setImportError('Paste or scan text before importing.');
            return;
        }

        setIsImporting(true);
        setImportError(null);

        router.post(
            importScan(territoryId).url,
            {
                lines: ocrText,
                default_city: normalizeValue(defaults.city),
                default_region: normalizeValue(defaults.region),
                default_postal_code: normalizeValue(defaults.postal_code),
                default_country: normalizeValue(defaults.country),
                status,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsImporting(false),
                onError: (errors) => {
                    setImportError(
                        errors.lines ??
                            'Import failed. Please review the text.',
                    );
                },
            },
        );
    };

    return (
        <div
            className={
                compact
                    ? 'space-y-4'
                    : 'rounded-sm border border-sidebar-border/70 p-4'
            }
        >
            {!compact && (
                <div className="mb-3">
                    <h2 className="text-sm font-semibold">
                        Import addresses from scan
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Upload a photo or scan of your address list, review the
                        text, then import.
                    </p>
                </div>
            )}

            <div className="space-y-4">
                <div className="grid gap-2">
                    <Label htmlFor="scan-file">Scan image</Label>
                    <Input
                        id="scan-file"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <InputError message={scanError ?? undefined} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="default_city">Default city</Label>
                        <Input
                            id="default_city"
                            value={defaults.city}
                            onChange={(event) =>
                                setDefaults((current) => ({
                                    ...current,
                                    city: event.target.value,
                                }))
                            }
                            placeholder="Montreal"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="default_region">Default region</Label>
                        <Input
                            id="default_region"
                            value={defaults.region}
                            onChange={(event) =>
                                setDefaults((current) => ({
                                    ...current,
                                    region: event.target.value,
                                }))
                            }
                            placeholder="QC"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="default_postal_code">
                            Default postal code
                        </Label>
                        <Input
                            id="default_postal_code"
                            value={defaults.postal_code}
                            onChange={(event) =>
                                setDefaults((current) => ({
                                    ...current,
                                    postal_code: event.target.value,
                                }))
                            }
                            placeholder="H2X 3L1"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="default_country">Default country</Label>
                        <Input
                            id="default_country"
                            value={defaults.country}
                            onChange={(event) =>
                                setDefaults((current) => ({
                                    ...current,
                                    country: event.target.value,
                                }))
                            }
                            placeholder="Canada"
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="scan-language">OCR language</Label>
                    <select
                        id="scan-language"
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                        <option value="eng">English (eng)</option>
                        <option value="fra">French (fra)</option>
                        <option value="eng+fra">English + French</option>
                    </select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="scan-status">Default status</Label>
                    <select
                        id="scan-status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="h-9 w-full rounded-sm border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                        {statusOptions.length === 0 && (
                            <option value="not_visited">Not visited</option>
                        )}
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={handleScan}
                        disabled={scanStatus === 'processing' || !scanFile}
                    >
                        {scanStatus === 'processing'
                            ? 'Scanning...'
                            : 'Scan image'}
                    </Button>
                    {scanProgress !== null && (
                        <span className="text-xs text-muted-foreground">
                            {scanProgress}% complete
                        </span>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="ocr-text">Detected text</Label>
                    <textarea
                        id="ocr-text"
                        value={ocrText}
                        onChange={(event) => setOcrText(event.target.value)}
                        rows={6}
                        className="w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                        placeholder="OCR results appear here."
                    />
                    <p className="text-xs text-muted-foreground">
                        {lineStats.total === 0
                            ? 'Lines with numbers will be imported as addresses.'
                            : `${lineStats.candidates} of ${lineStats.total} lines include numbers.`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        onClick={handleImport}
                        disabled={isImporting || !ocrText.trim()}
                    >
                        {isImporting ? 'Importing...' : 'Import addresses'}
                    </Button>
                    <InputError message={importError ?? undefined} />
                </div>
            </div>
        </div>
    );
}
