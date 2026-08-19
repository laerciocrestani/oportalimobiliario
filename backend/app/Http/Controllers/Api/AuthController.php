<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserActivityAction;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\UserActivityLogger;
use App\Support\BuilderPermissions;
use App\Support\PhoneNumberNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(
        private readonly UserActivityLogger $activityLogger,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = $this->findUserByLogin($credentials['email']);

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            $this->activityLogger->record(
                action: UserActivityAction::AuthLoginFailed,
                message: "Tentativa de login falhou para {$credentials['email']}.",
                actor: $user,
                tenantId: $user?->tenant_id,
            );

            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        $this->activityLogger->record(
            action: UserActivityAction::AuthLogin,
            message: 'Entrou no sistema.',
            actor: $user,
            tenantId: $user->tenant_id,
        );

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->usesSyntheticEmail() ? null : $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
            ],
        ]);
    }

    private function findUserByLogin(string $login): ?User
    {
        if (filter_var($login, FILTER_VALIDATE_EMAIL)) {
            return User::query()->where('email', $login)->first();
        }

        $normalizedPhone = app(PhoneNumberNormalizer::class)->toE164($login);

        if ($normalizedPhone !== null) {
            return User::query()->where('phone', $normalizedPhone)->first();
        }

        return User::query()->where('email', $login)->first();
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $permissions = $user->role === 'builder' && $user->tenant_id !== null
            ? BuilderPermissions::namesFor($user)
            : [];

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'tenant_id' => $user->tenant_id,
            'roles' => $user->getRoleNames(),
            'permissions' => $permissions,
        ]);
    }

    public function exchangeImpersonation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'uuid'],
        ]);

        $payload = Cache::pull('impersonate:'.$data['code']);

        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'code' => ['Código inválido ou expirado.'],
            ]);
        }

        $user = User::query()->find($payload['user_id'] ?? null);

        if ($user === null || $user->role !== 'builder' || $user->tenant_id !== ($payload['tenant_id'] ?? null)) {
            throw ValidationException::withMessages([
                'code' => ['Código inválido ou expirado.'],
            ]);
        }

        $tenant = Tenant::query()->find($payload['tenant_id'] ?? null);

        if ($tenant === null || ! $tenant->active) {
            throw ValidationException::withMessages([
                'code' => ['Código inválido ou expirado.'],
            ]);
        }

        $adminId = (int) ($payload['admin_id'] ?? 0);

        $this->activityLogger->record(
            action: UserActivityAction::ImpersonateStart,
            message: 'Sessão de impersonate iniciada.',
            actor: $user,
            tenantId: $user->tenant_id,
            impersonatorUserId: $adminId > 0 ? $adminId : null,
        );

        $token = $user->createToken('impersonate:'.($payload['admin_id'] ?? 'unknown'))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $accessToken = $user->currentAccessToken();
        $impersonatorId = $this->impersonatorIdFromToken($accessToken);

        if ($impersonatorId === null && $accessToken === null && $request->bearerToken() !== null) {
            $impersonatorId = $this->impersonatorIdFromToken(
                PersonalAccessToken::findToken($request->bearerToken()),
            );
        }

        if ($impersonatorId !== null) {
            $this->activityLogger->record(
                action: UserActivityAction::ImpersonateStop,
                message: 'Encerrou a sessão de impersonate.',
                actor: $user,
                tenantId: $user->tenant_id,
                impersonatorUserId: $impersonatorId,
            );
        }

        $this->activityLogger->record(
            action: UserActivityAction::AuthLogout,
            message: 'Saiu do sistema.',
            actor: $user,
            tenantId: $user->tenant_id,
            impersonatorUserId: $impersonatorId,
        );

        if ($accessToken !== null) {
            $accessToken->delete();
        } elseif ($bearerToken = $request->bearerToken()) {
            PersonalAccessToken::findToken($bearerToken)?->delete();
        }

        return response()->json(['message' => 'Logged out']);
    }

    private function impersonatorIdFromToken(mixed $token): ?int
    {
        if (! is_object($token) || ! isset($token->name) || ! is_string($token->name)) {
            return null;
        }

        if (! str_starts_with($token->name, 'impersonate:')) {
            return null;
        }

        $id = (int) substr($token->name, strlen('impersonate:'));

        return $id > 0 ? $id : null;
    }
}
