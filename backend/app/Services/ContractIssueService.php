<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContractIssueService
{
    public function __construct(
        private readonly ContractVariableResolver $resolver,
        private readonly ContractPdfRenderer $renderer,
        private readonly ReservationTimelineService $timelineService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function preview(Reservation $reservation, ContractTemplate $template): array
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
            'required_custom_slugs' => $this->resolver->requiredCustomSlugs($template),
            'suggested_price' => $reservation->unit?->frozen_price_brl ?? $reservation->unit?->price,
        ];
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function activeTemplates(Reservation $reservation): array
    {
        $this->assertCanIssue($reservation);

        return ContractTemplate::query()
            ->where('tenant_id', $reservation->tenant_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (ContractTemplate $template) => [
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
    public function issue(User $actor, Reservation $reservation, ContractTemplate $template, array $values, string $finalPriceBrl): array
    {
        $this->assertTemplateForReservation($reservation, $template);
        $this->assertCanIssue($reservation);

        $merged = $this->resolver->mergeValues($reservation, $template, $values, $finalPriceBrl);
        $this->assertRequiredValues($template, $merged);

        return DB::transaction(function () use ($actor, $reservation, $template, $merged, $finalPriceBrl) {
            $reservation->loadMissing('unit');
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
                'kind' => ReservationAttachmentKind::ContractPdf,
                'path' => $path,
                'original_name' => Str::slug($template->name).'.pdf',
                'mime_type' => 'application/pdf',
                'size_bytes' => strlen($pdf),
                'uploaded_by' => $actor->id,
            ]);

            $reservation->unit?->update([
                'frozen_price_brl' => $finalPriceBrl,
            ]);

            $reservation->update([
                'status' => ReservationStatus::ContractIssued,
                'contract_template_id' => $template->id,
                'contract_values' => $merged,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractIssued,
                $actor,
                ['template_id' => $template->id, 'final_price_brl' => $finalPriceBrl],
            );

            $fresh = $reservation->fresh(['unit']);

            return [
                'status' => $fresh?->status->value,
                'frozen_price_brl' => $fresh?->unit?->frozen_price_brl,
                'attachment' => $attachment->toApiArray("/builder/reservations/{$reservation->id}/attachments"),
            ];
        });
    }

    private function assertTemplateForReservation(Reservation $reservation, ContractTemplate $template): void
    {
        if ((int) $template->tenant_id !== (int) $reservation->tenant_id) {
            abort(404);
        }

        if (! $template->is_active) {
            throw ValidationException::withMessages([
                'contract_template_id' => 'O modelo de contrato está inativo.',
            ]);
        }
    }

    private function assertCanIssue(Reservation $reservation): void
    {
        if ($this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractUploaded)
            || $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractSignedGov)
            || $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::Sold)) {
            throw ValidationException::withMessages([
                'reservation' => 'O contrato não pode ser reemitido após o início da assinatura.',
            ]);
        }

        $hasContractData = $this->timelineService->hasEventType(
            $reservation,
            ReservationTimelineEventType::ContractDataSubmitted,
        );

        if (! $hasContractData || (! $reservation->isContractDataPending() && ! $reservation->isContractIssued())) {
            throw ValidationException::withMessages([
                'reservation' => 'A reserva não está na etapa de emissão de contrato.',
            ]);
        }
    }

    /**
     * @param  array<string, string>  $values
     */
    private function assertRequiredValues(ContractTemplate $template, array $values): void
    {
        $missing = [];

        foreach ($this->resolver->requiredCustomSlugs($template) as $slug) {
            if (trim($values[$slug] ?? '') === '') {
                $missing[$slug][] = 'Preencha este campo para emitir o contrato.';
            }
        }

        if (trim($values['preco_final'] ?? '') === '') {
            $missing['final_price_brl'][] = 'Informe o valor final em R$.';
        }

        if ($missing !== []) {
            throw ValidationException::withMessages($missing);
        }
    }

    private function replacePreviousPdf(Reservation $reservation): void
    {
        $previous = $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ContractPdf)
            ->get();

        foreach ($previous as $attachment) {
            Storage::disk('local')->delete($attachment->path);
            $attachment->delete();
        }
    }
}
