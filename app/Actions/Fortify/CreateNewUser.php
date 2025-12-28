<?php

namespace App\Actions\Fortify;

use App\Models\Organization;
use App\Models\OrganizationOption;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'organization_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'password' => $this->passwordRules(),
        ])->validate();

        $slugBase = Str::slug($input['organization_name']);
        $slug = $slugBase;
        $counter = 1;
        while (Organization::where('slug', $slug)->exists()) {
            $slug = $slugBase.'-'.$counter;
            $counter++;
        }

        $organization = Organization::create([
            'name' => $input['organization_name'],
            'slug' => $slug,
        ]);

        OrganizationOption::seedDefaults($organization->id);

        return User::create([
            'organization_id' => $organization->id,
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'role' => 'admin',
        ]);
    }
}
