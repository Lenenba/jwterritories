<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Address extends Model
{
    /** @use HasFactory<\Database\Factories\AddressFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'territory_id',
        'civic_number',
        'unit',
        'label',
        'contact_name',
        'street',
        'street2',
        'city',
        'region',
        'postal_code',
        'country',
        'phone',
        'notes',
        'lat',
        'lng',
        'status',
        'do_not_call',
        'last_visit_at',
        'next_visit_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'do_not_call' => 'boolean',
            'last_visit_at' => 'datetime',
            'next_visit_at' => 'datetime',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function territory(): BelongsTo
    {
        return $this->belongsTo(Territory::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }
}
