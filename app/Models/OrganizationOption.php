<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationOption extends Model
{
    /** @use HasFactory<\Database\Factories\OrganizationOptionFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'list_key',
        'label',
        'value',
        'description',
        'sort',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Seed default options for an organization.
     */
    public static function seedDefaults(int $organizationId): void
    {
        $defaults = [
            [
                'list_key' => 'address_status',
                'label' => 'Not visited',
                'value' => 'not_visited',
                'sort' => 10,
            ],
            [
                'list_key' => 'address_status',
                'label' => 'No answer',
                'value' => 'no_answer',
                'sort' => 20,
            ],
            [
                'list_key' => 'address_status',
                'label' => 'Contact',
                'value' => 'contact',
                'sort' => 30,
            ],
            [
                'list_key' => 'address_status',
                'label' => 'Return requested',
                'value' => 'return_requested',
                'sort' => 40,
            ],
            [
                'list_key' => 'address_status',
                'label' => 'Do not call',
                'value' => 'do_not_call',
                'sort' => 50,
            ],
            [
                'list_key' => 'visit_result',
                'label' => 'No answer',
                'value' => 'no_answer',
                'sort' => 10,
            ],
            [
                'list_key' => 'visit_result',
                'label' => 'Contact',
                'value' => 'contact',
                'sort' => 20,
            ],
            [
                'list_key' => 'visit_result',
                'label' => 'Return requested',
                'value' => 'return_requested',
                'sort' => 30,
            ],
            [
                'list_key' => 'visit_result',
                'label' => 'Do not call',
                'value' => 'do_not_call',
                'sort' => 40,
            ],
            [
                'list_key' => 'visit_action',
                'label' => 'None',
                'value' => 'none',
                'sort' => 10,
            ],
            [
                'list_key' => 'visit_action',
                'label' => 'Follow up',
                'value' => 'follow_up',
                'sort' => 20,
            ],
            [
                'list_key' => 'visit_action',
                'label' => 'Do not call',
                'value' => 'do_not_call',
                'sort' => 30,
            ],
        ];

        foreach ($defaults as $option) {
            static::updateOrCreate(
                [
                    'organization_id' => $organizationId,
                    'list_key' => $option['list_key'],
                    'value' => $option['value'],
                ],
                [
                    'label' => $option['label'],
                    'sort' => $option['sort'],
                    'is_active' => true,
                ]
            );
        }
    }
}
