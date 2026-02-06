import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { getStorePricingForFood, addStorePricing, deleteStorePricing } from '@/lib/db';
import type { StorePricing, SavedFood } from '@/types';

interface StorePricingDialogProps {
    food: SavedFood;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StorePricingDialog({ food, open, onOpenChange }: StorePricingDialogProps) {
    const [pricing, setPricing] = useState<StorePricing[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Form state
    const [store, setStore] = useState('');
    const [price, setPrice] = useState('');
    const [packageSize, setPackageSize] = useState('');
    const [packageUnit, setPackageUnit] = useState('g');

    const loadPricing = useCallback(async () => {
        if (!food.id) return;
        setLoading(true);
        try {
            const data = await getStorePricingForFood(food.id);
            setPricing(data);
        } finally {
            setLoading(false);
        }
    }, [food.id]);

    useEffect(() => {
        if (open && food.id) {
            void loadPricing();
        }
    }, [open, food.id, loadPricing]);

    const resetForm = () => {
        setStore('');
        setPrice('');
        setPackageSize('');
        setPackageUnit('g');
        setShowAddForm(false);
    };

    const handleAdd = async () => {
        if (!food.id || !store.trim() || !price || !packageSize) return;

        const priceValue = parseFloat(price);
        const packageSizeValue = parseFloat(packageSize);

        // Validate: no negative prices, no zero/negative package sizes
        if (priceValue < 0 || packageSizeValue <= 0) return;

        setSaving(true);
        try {
            await addStorePricing({
                savedFoodId: food.id,
                store: store.trim(),
                price: priceValue,
                packageSize: packageSizeValue,
                packageUnit,
                lastUpdated: new Date(),
            });

            resetForm();
            await loadPricing();
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await deleteStorePricing(id);
            await loadPricing();
        } finally {
            setDeletingId(null);
        }
    };

    const formatPricePerKg = (pricePerKg: number | undefined) => {
        if (pricePerKg === undefined) return '-';
        return `${pricePerKg.toFixed(2)}/kg`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Store Prices - {food.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {loading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading...</div>
                    ) : pricing.length === 0 && !showAddForm ? (
                        <div className="py-8 text-center">
                            <p className="text-muted-foreground mb-4">No prices recorded yet</p>
                            <Button onClick={() => setShowAddForm(true)}>Add Price</Button>
                        </div>
                    ) : (
                        <>
                            {/* Price list */}
                            {pricing.length > 0 && (
                                <div className="space-y-2">
                                    {pricing.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium">{p.store}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    €{p.price.toFixed(2)} / {p.packageSize}
                                                    {p.packageUnit}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-primary">
                                                        €{formatPricePerKg(p.pricePerKg)}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => p.id && handleDelete(p.id)}
                                                    disabled={deletingId === p.id}
                                                >
                                                    {deletingId === p.id ? (
                                                        <svg
                                                            className="w-4 h-4 animate-spin"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            />
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                            />
                                                        </svg>
                                                    ) : (
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                            />
                                                        </svg>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add form */}
                            {showAddForm ? (
                                <div className="space-y-3 p-4 border rounded-lg bg-background">
                                    <div className="space-y-2">
                                        <Label htmlFor="store">Store</Label>
                                        <Input
                                            id="store"
                                            placeholder="e.g., REWE, Aldi, Lidl"
                                            value={store}
                                            onChange={(e) => setStore(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="price">Price (EUR)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                    €
                                                </span>
                                                <Input
                                                    id="price"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    className="pl-7"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="packageSize">Package Size</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="packageSize"
                                                    type="number"
                                                    min="1"
                                                    placeholder="500"
                                                    value={packageSize}
                                                    onChange={(e) => setPackageSize(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <select
                                                    value={packageUnit}
                                                    onChange={(e) => setPackageUnit(e.target.value)}
                                                    className="px-2 border rounded-md bg-background"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="kg">kg</option>
                                                    <option value="ml">ml</option>
                                                    <option value="l">l</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={resetForm}
                                            disabled={saving}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAdd}
                                            disabled={
                                                saving ||
                                                !store.trim() ||
                                                !price ||
                                                !packageSize ||
                                                parseFloat(price) < 0 ||
                                                parseFloat(packageSize) <= 0
                                            }
                                            className="flex-1"
                                        >
                                            {saving ? (
                                                <svg
                                                    className="w-4 h-4 animate-spin"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                                    />
                                                </svg>
                                            ) : (
                                                'Add'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddForm(true)}
                                    className="w-full"
                                >
                                    <svg
                                        className="w-4 h-4 mr-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    Add Price
                                </Button>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
