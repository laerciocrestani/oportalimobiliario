<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationTimelineEventType;
use App\Models\ProposalTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProposalIssueService
{
    public function __construct(
        private readonly ContractVariableResolver $resolver,
        private readonly ContractPdfRenderer $renderer,
        private readonly ReservationTimelineService $timelineService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function preview(Reservation $reservation, ProposalTemplate $template): array
    {
        $this->assertTemplateForReservation($reservation, $template);
        $this->assertCanIssue($reservation);

        $customVariables = $template->custom_variables ?? [];

        return [
            'template' => [
                'id' => $template->id,
                'name' => $template->name,
            ],
            'system_values' => $this->resolver->systemValues($reservation),
            'custom_variables' => $customVariables,
            'unknown_placeholders' => $this->resolver->unknownPlaceholders(
                $template->body_markdown,
                array_column($customVariables, 'slug'),
            ),
            'required_custom_slugs' => $this->resolver->requiredPlaceholders(
                $template->body_markdown,
                $customVariables,
            ),
            'suggested_price' => $reservation->unit?->frozen_price_brl ?? $reservation->unit?->price,
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function activeTemplates(Reservation $reservation): array
    {
        $this->assertCanIssue($reservation);

        return ProposalTemplate::query()
            ->where('tenant_id', $reservation->tenant_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (ProposalTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    public function issue(User $actor, Reservation $reservation, ProposalTemplate $template, array $values, ?string $finalPriceBrl = null): array
    {
        $this->assertTemplateForReservation($reservation, $template);
        $this->assertCanIssue($reservation);

        $price = $finalPriceBrl ?? (string) ($reservation->unit?->frozen_price_brl ?? $reservation->unit?->price ?? '');
        $merged = $this->resolver->mergeOverrides($reservation, $values, $price);
        $this->assertRequiredValues($template, $merged);

        return DB::transaction(function () use ($actor, $reservation, $template, $merged) {
            $pdf = $this->renderer->render($template->body_markdown, $merged);
            $this->replacePreviousPdf($reservation);

            $path = sprintf(
                'reservations/%d/%d/%s.pdf',
                $reservation->tenant_id,
                $reservation->id,
                Str::uuid(),
            );
            Storage::disk('local')->put($path, $pdf);

            $attachment = ReservationAttachment::query()->create([
                'reservation_id' => $reservation->id,
                'kind' => ReservationAttachmentKind::ProposalPdf,
                'path' => $path,
                'original_name' => Str::slug($template->name).'.pdf',
                'mime_type' => 'application/pdf',
                'size_bytes' => strlen($pdf),
                'uploaded_by' => $actor->id,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ProposalPdfIssued,
                $actor,
                ['template_id' => $template->id, 'attachment_id' => $attachment->id],
            );

            return [
                'attachment' => $attachment->toApiArray("/builder/reservations/{$reservation->id}/attachments"),
            ];
        });
    }

    private function assertTemplateForReservation(Reservation $reservation, ProposalTemplate $template): void
    {
        if ((int) $template->tenant_id !== (int) $reservation->tenant_id) {
            abort(404);
        }

        if (! $template->is_active) {
            throw ValidationException::withMessages([
                'proposal_template_id' => 'O modelo de proposta está inativo.',
            ]);
        }
    }

    private function assertCanIssue(Reservation $reservation): void
    {
        if (! $reservation->isProposalPending()) {
            throw ValidationException::withMessages([
                'reservation' => 'A reserva não está na etapa de decisão da proposta.',
            ]);
        }
    }

    /**
     * @param  array<string, string>  $values
     */
    private function assertRequiredValues(ProposalTemplate $template, array $values): void
    {
        $missing = [];

        foreach ($this->resolver->requiredPlaceholders($template->body_markdown, $template->custom_variables ?? []) as $slug) {
            if (trim($values[$slug] ?? '') === '') {
                $missing[$slug][] = 'Preencha este campo para emitir a proposta.';
            }
        }

        if ($missing !== []) {
            throw ValidationException::withMessages($missing);
        }
    }

    private function replacePreviousPdf(Reservation $reservation): void
    {
        $previous = $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ProposalPdf)
            ->get();

        foreach ($previous as $attachment) {
            Storage::disk('local')->delete($attachment->path);
            $attachment->delete();
        }
    }
}
