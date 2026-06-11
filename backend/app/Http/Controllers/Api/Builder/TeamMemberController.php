<?php

namespace App\Http\Controllers\Api\Builder;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\BuilderPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * @see REQ-TEAM-003
 */
class TeamMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $members = User::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->where('role', 'builder')
            ->orderBy('name')
            ->get()
            ->map(fn (User $member) => $this->formatMember($member));

        return response()->json($members);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in(BuilderPermissions::all())],
        ]);

        $member = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'builder',
            'tenant_id' => $request->user()->tenant_id,
        ]);

        BuilderPermissions::assign($member, $data['permissions']);

        return response()->json($this->formatMember($member->fresh()), 201);
    }

    public function update(Request $request, User $teamMember): JsonResponse
    {
        $this->authorize('update', $teamMember);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'password' => ['sometimes', 'string', 'min:8'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(BuilderPermissions::all())],
        ]);

        if (isset($data['permissions'])) {
            $this->ensureTeamManagerRemains($teamMember, $data['permissions']);
            BuilderPermissions::assign($teamMember, $data['permissions']);
        }

        $updates = array_filter([
            'name' => $data['name'] ?? null,
            'password' => isset($data['password']) ? Hash::make($data['password']) : null,
        ], fn ($value) => $value !== null);

        if ($updates !== []) {
            $teamMember->update($updates);
        }

        return response()->json($this->formatMember($teamMember->fresh()));
    }

    public function destroy(Request $request, User $teamMember): JsonResponse
    {
        $this->authorize('delete', $teamMember);

        if ($teamMember->hasPermissionTo(BuilderPermissions::MANAGE_TEAM)
            && BuilderPermissions::countTeamManagers((int) $request->user()->tenant_id, $teamMember->id) === 0) {
            return response()->json(['message' => 'Cannot remove the last team manager.'], 422);
        }

        $teamMember->delete();

        return response()->json(null, 204);
    }

    /**
     * @param  list<string>  $permissions
     */
    private function ensureTeamManagerRemains(User $member, array $permissions): void
    {
        if (! $member->hasPermissionTo(BuilderPermissions::MANAGE_TEAM)) {
            return;
        }

        if (in_array(BuilderPermissions::MANAGE_TEAM, $permissions, true)) {
            return;
        }

        if (BuilderPermissions::countTeamManagers((int) $member->tenant_id, $member->id) === 0) {
            abort(422, 'Cannot remove team management from the last team manager.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMember(User $member): array
    {
        return [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'permissions' => BuilderPermissions::namesFor($member),
            'created_at' => $member->created_at,
        ];
    }
}
