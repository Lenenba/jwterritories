<?php

use App\Http\Controllers\AddressController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MapController;
use App\Http\Controllers\TerritoryController;
use App\Http\Controllers\VisitController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    Route::get('map', [MapController::class, 'index'])->name('map.index');

    Route::resource('territories', TerritoryController::class)
        ->only(['index', 'create', 'store', 'show', 'edit', 'update', 'destroy']);

    Route::post('territories/{territory}/addresses', [AddressController::class, 'store'])
        ->name('territories.addresses.store');
    Route::post('territories/{territory}/addresses/import-scan', [AddressController::class, 'importScan'])
        ->name('territories.addresses.import-scan');
    Route::post('territories/{territory}/addresses/bulk', [AddressController::class, 'bulkStore'])
        ->name('territories.addresses.bulk');

    Route::get('addresses/{address}/edit', [AddressController::class, 'edit'])
        ->name('addresses.edit');
    Route::patch('addresses/{address}', [AddressController::class, 'update'])
        ->name('addresses.update');
    Route::delete('addresses/{address}', [AddressController::class, 'destroy'])
        ->name('addresses.destroy');
    Route::get('addresses/{address}', [AddressController::class, 'show'])
        ->name('addresses.show');

    Route::get('addresses/{address}/visits/{visit}/edit', [VisitController::class, 'edit'])
        ->name('addresses.visits.edit');
    Route::patch('addresses/{address}/visits/{visit}', [VisitController::class, 'update'])
        ->name('addresses.visits.update');
    Route::delete('addresses/{address}/visits/{visit}', [VisitController::class, 'destroy'])
        ->name('addresses.visits.destroy');
    Route::post('addresses/{address}/visits', [VisitController::class, 'store'])
        ->name('addresses.visits.store');

    Route::get('assignments', [AssignmentController::class, 'index'])
        ->name('assignments.index');
    Route::post('assignments', [AssignmentController::class, 'store'])
        ->name('assignments.store');
    Route::get('assignments/{assignment}/edit', [AssignmentController::class, 'edit'])
        ->name('assignments.edit');
    Route::patch('assignments/{assignment}', [AssignmentController::class, 'update'])
        ->name('assignments.update');
    Route::delete('assignments/{assignment}', [AssignmentController::class, 'destroy'])
        ->name('assignments.destroy');
});

require __DIR__.'/settings.php';
