<?php

use App\Mail\BrokerAccessRequestMail;
use App\Models\BrokerAccessRequest;
use App\Models\Building;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    Cache::flush();
});

it('stores a public access request and emails the builder', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create(['name' => 'Construtora Alpha']);
    $building = Building::factory()->for($tenant)->published()->create(['name' => 'Bosque']);
    User::factory()->builder()->create([
        'tenant_id' => $tenant->id,
        'email' => 'construtora@alpha.demo',
        'phone' => '1130001001',
    ]);

    $this->postJson("/api/public/buildings/{$building->slug}/access-requests", [
        'name' => 'Ana Corretores',
        'phone' => '(11) 98888-7777',
        'email' => 'Ana@Corretora.test',
    ])
        ->assertCreated()
        ->assertJsonPath('message', 'Pedido enviado para a construtora.');

    $request = BrokerAccessRequest::query()->first();

    expect($request)
        ->not->toBeNull()
        ->tenant_id->toBe($tenant->id)
        ->building_id->toBe($building->id)
        ->name->toBe('Ana Corretores')
        ->phone->toBe('+5511988887777')
        ->email->toBe('ana@corretora.test');

    Mail::assertSent(BrokerAccessRequestMail::class, function (BrokerAccessRequestMail $mail) {
        return $mail->hasTo('construtora@alpha.demo')
            && $mail->brokerName === 'Ana Corretores'
            && $mail->phone === '+5511988887777'
            && $mail->email === 'ana@corretora.test'
            && $mail->buildingName === 'Bosque';
    });
});

it('accepts an access request without email', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    $this->postJson("/api/public/buildings/{$building->slug}/access-requests", [
        'name' => 'Paulo',
        'phone' => '1130001001',
        'email' => '',
    ])->assertCreated();

    expect(BrokerAccessRequest::query()->first())
        ->email->toBeNull()
        ->phone->toBe('+551130001001');

    Mail::assertNothingSent();
});

it('updates the same phone instead of creating another request', function () {
    Mail::fake();

    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();
    User::factory()->builder()->create([
        'tenant_id' => $tenant->id,
        'email' => 'construtora@alpha.demo',
    ]);

    $payload = [
        'name' => 'Ana',
        'phone' => '11988887777',
    ];

    $this->postJson("/api/public/buildings/{$building->slug}/access-requests", $payload)
        ->assertCreated();

    $this->postJson("/api/public/buildings/{$building->slug}/access-requests", [
        'name' => 'Ana Costa',
        'phone' => '(11) 98888-7777',
        'email' => 'ana@example.com',
    ])
        ->assertOk()
        ->assertJsonPath('message', 'Pedido enviado para a construtora.');

    expect(BrokerAccessRequest::query()->count())->toBe(1)
        ->and(BrokerAccessRequest::query()->first())
        ->name->toBe('Ana Costa')
        ->email->toBe('ana@example.com');

    Mail::assertSent(BrokerAccessRequestMail::class, 1);
});

it('rejects an access request with an invalid phone or email', function (array $payload, string $field) {
    $tenant = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();

    $this->postJson("/api/public/buildings/{$building->slug}/access-requests", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);

    expect(BrokerAccessRequest::query()->count())->toBe(0);
})->with([
    'missing name' => [['phone' => '11988887777'], 'name'],
    'missing phone' => [['name' => 'Ana'], 'phone'],
    'short phone' => [['name' => 'Ana', 'phone' => '123'], 'phone'],
    'invalid email' => [['name' => 'Ana', 'phone' => '11988887777', 'email' => 'nao-e-email'], 'email'],
]);

it('does not store an access request for an unpublished or unknown building', function () {
    $tenant = Tenant::factory()->create();
    $draft = Building::factory()->for($tenant)->create(['published' => false]);

    $this->postJson("/api/public/buildings/{$draft->slug}/access-requests", [
        'name' => 'Ana',
        'phone' => '11988887777',
    ])->assertNotFound();

    $this->postJson('/api/public/buildings/nao-existe/access-requests', [
        'name' => 'Ana',
        'phone' => '11988887777',
    ])->assertNotFound();

    expect(BrokerAccessRequest::query()->count())->toBe(0);
});

it('keeps the access request on the building tenant', function () {
    $tenant = Tenant::factory()->create();
    $other = Tenant::factory()->create();
    $building = Building::factory()->for($tenant)->published()->create();
    Building::factory()->for($other)->published()->create();

    $this->postJson("/api/public/buildings/{$building->slug}/access-requests", [
        'name' => 'Ana',
        'phone' => '11988887777',
    ])->assertCreated();

    expect(BrokerAccessRequest::query()->where('tenant_id', $other->id)->count())->toBe(0)
        ->and(BrokerAccessRequest::query()->where('tenant_id', $tenant->id)->count())->toBe(1);
});
