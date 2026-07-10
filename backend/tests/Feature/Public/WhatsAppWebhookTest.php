<?php

/**
 * @see REQ-WA-006
 */
use App\Enums\BrokerInviteDeliveryStatus;
use App\Models\BrokerInvite;
use App\Models\Tenant;
use App\Models\User;

it('verifies whatsapp webhook challenge', function () {
    config(['services.whatsapp.verify_token' => 'secret-token']);

    $this->getJson('/api/public/whatsapp/webhook?hub_mode=subscribe&hub_verify_token=secret-token&hub_challenge=12345')
        ->assertOk()
        ->assertSee('12345');
});

it('rejects invalid whatsapp webhook verification', function () {
    config(['services.whatsapp.verify_token' => 'secret-token']);

    $this->getJson('/api/public/whatsapp/webhook?hub_mode=subscribe&hub_verify_token=wrong&hub_challenge=12345')
        ->assertForbidden();
});

it('updates invite delivery status from whatsapp webhook', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();

    $invite = BrokerInvite::factory()->whatsapp()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'whatsapp_message_id' => 'wamid.abc123',
        'delivery_status' => BrokerInviteDeliveryStatus::Sent,
    ]);

    $this->postJson('/api/public/whatsapp/webhook', [
        'entry' => [[
            'changes' => [[
                'value' => [
                    'statuses' => [[
                        'id' => 'wamid.abc123',
                        'status' => 'delivered',
                    ]],
                ],
            ]],
        ]],
    ])->assertOk();

    expect($invite->fresh()->delivery_status)->toBe(BrokerInviteDeliveryStatus::Delivered);
});

it('declines invite when whatsapp decline button is tapped', function () {
    config(['services.whatsapp.decline_button_text' => '❌ Recusar']);

    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();

    $invite = BrokerInvite::factory()->whatsapp()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'whatsapp_message_id' => 'wamid.abc123',
        'delivery_status' => BrokerInviteDeliveryStatus::Sent,
    ]);

    $this->postJson('/api/public/whatsapp/webhook', [
        'entry' => [[
            'changes' => [[
                'value' => [
                    'messages' => [[
                        'type' => 'button',
                        'button' => [
                            'text' => '❌ Recusar',
                            'payload' => '❌ Recusar',
                        ],
                        'context' => [
                            'id' => 'wamid.abc123',
                        ],
                    ]],
                ],
            ]],
        ]],
    ])->assertOk();

    $invite->refresh();

    expect($invite->declined_at)->not->toBeNull();
});

it('rejects preview for declined invite', function () {
    $tenant = Tenant::factory()->create();
    $builder = User::factory()->builder()->for($tenant)->create();

    $invite = BrokerInvite::factory()->create([
        'tenant_id' => $tenant->id,
        'created_by' => $builder->id,
        'declined_at' => now(),
    ]);

    $this->getJson('/api/broker/invites/preview?token='.$invite->token)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['token']);
});
