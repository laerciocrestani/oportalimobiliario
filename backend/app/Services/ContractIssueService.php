<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationStatus;
use App\Enums\ReservationTimelineEventType;
use App\Jobs\SendContractToZapSign;
use App\Models\ContractTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\User;
use App\Support\ProposalModuleMarkdown;
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
        $this->assertClientSnapshot($reservation);

        $merged = $this->resolver->mergeValues($reservation, $template, $values, $finalPriceBrl);
        $this->assertRequiredValues($template, $merged);

        $result = DB::transaction(function () use ($actor, $reservation, $template, $merged, $finalPriceBrl) {
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

        SendContractToZapSign::dispatch($reservation->id);

        return $result;
    }

    public function issueDefault(User $actor, Reservation $reservation): void
    {
        $template = ContractTemplate::query()
            ->where('tenant_id', $reservation->tenant_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        if ($template === null) {
            return;
        }

        $this->storeDraft($reservation, $template, $this->fillBody($reservation, $template));
    }

    /**
     * @return array{templates: list<array{id: int, name: string}>, template_id: int|null, body: string, html: string}
     */
    public function review(Reservation $reservation): array
    {
        $this->assertCanPrepare($reservation);
        $this->ensureDraft($reservation);

        return $this->present($reservation->fresh() ?? $reservation);
    }

    /**
     * @return array{templates: list<array{id: int, name: string}>, template_id: int|null, body: string, html: string}
     */
    public function useTemplate(Reservation $reservation, int $templateId): array
    {
        $this->assertCanPrepare($reservation);
        $template = $this->activeTemplate($reservation, $templateId);
        $this->storeDraft($reservation, $template, $this->fillBody($reservation, $template));

        return $this->present($reservation->fresh() ?? $reservation);
    }

    /**
     * @return array{templates: list<array{id: int, name: string}>, template_id: int|null, body: string, html: string}
     */
    public function saveDraft(Reservation $reservation, string $body): array
    {
        $this->assertCanPrepare($reservation);
        $this->ensureDraft($reservation);
        $reservation->update([
            'contract_draft_markdown' => trim($body),
        ]);

        return $this->present($reservation->fresh() ?? $reservation);
    }

    /**
     * @return array<string, mixed>
     */
    public function accept(User $actor, Reservation $reservation): array
    {
        $this->assertCanPrepare($reservation);
        $this->ensureDraft($reservation);
        $reservation->refresh();
        $body = trim((string) $reservation->contract_draft_markdown);

        if ($body === '') {
            throw ValidationException::withMessages([
                'body' => 'O contrato está vazio.',
            ]);
        }

        $template = $reservation->contract_template_id !== null
            ? ContractTemplate::query()->find($reservation->contract_template_id)
            : null;
        $price = (string) ($reservation->unit?->frozen_price_brl ?? $reservation->unit?->price ?? '');

        $result = DB::transaction(function () use ($actor, $reservation, $template, $body, $price) {
            $pdf = $this->renderer->render($body, []);
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
                'original_name' => Str::slug($template?->name ?: 'contrato').'.pdf',
                'mime_type' => 'application/pdf',
                'size_bytes' => strlen($pdf),
                'uploaded_by' => $actor->id,
            ]);

            if ($price !== '' && $reservation->unit !== null) {
                $reservation->unit->update([
                    'frozen_price_brl' => $price,
                ]);
            }

            $reservation->update([
                'status' => ReservationStatus::ContractIssued,
            ]);

            $this->timelineService->record(
                $reservation,
                ReservationTimelineEventType::ContractIssued,
                $actor,
                [
                    'template_id' => $reservation->contract_template_id,
                    'final_price_brl' => $price,
                ],
            );

            return [
                'status' => $reservation->fresh()?->status->value,
                'attachment' => $attachment->toApiArray("/builder/reservations/{$reservation->id}/attachments"),
            ];
        });

        SendContractToZapSign::dispatch($reservation->id);

        return $result;
    }

    public function fillBody(Reservation $reservation, ContractTemplate $template): string
    {
        $reservation->loadMissing('unit');
        $price = (string) ($reservation->unit?->frozen_price_brl ?? $reservation->unit?->price ?? '0');
        $values = $this->resolver->mergeValues($reservation, $template, [], $price);
        $markdown = ProposalModuleMarkdown::expand($template->body_markdown, $values);

        return preg_replace_callback(
            '/\{\{\s*([a-z][a-z0-9_]*)\s*\??\s*\}\}/',
            fn (array $matches): string => (string) ($values[$matches[1]] ?? ''),
            $markdown,
        ) ?? $markdown;
    }

    private function ensureDraft(Reservation $reservation): void
    {
        if (trim((string) $reservation->contract_draft_markdown) !== '') {
            return;
        }

        $template = $reservation->contract_template_id !== null
            ? ContractTemplate::query()->where('is_active', true)->find($reservation->contract_template_id)
            : null;
        $template ??= ContractTemplate::query()
            ->where('tenant_id', $reservation->tenant_id)
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        if ($template === null) {
            return;
        }

        $this->storeDraft($reservation, $template, $this->fillBody($reservation, $template));
    }

    private function storeDraft(Reservation $reservation, ContractTemplate $template, string $body): void
    {
        $reservation->update([
            'contract_template_id' => $template->id,
            'contract_draft_markdown' => $body,
        ]);
    }

    /**
     * @return array{templates: list<array{id: int, name: string}>, template_id: int|null, body: string, html: string}
     */
    private function present(Reservation $reservation): array
    {
        $body = (string) $reservation->contract_draft_markdown;

        return [
            'templates' => $this->activeTemplates($reservation),
            'template_id' => $reservation->contract_template_id,
            'body' => $body,
            'html' => (string) Str::markdown($body, [
                'html_input' => 'strip',
                'allow_unsafe_links' => false,
            ]),
        ];
    }

    private function activeTemplate(Reservation $reservation, int $templateId): ContractTemplate
    {
        $template = ContractTemplate::query()->find($templateId);

        if ($template === null) {
            abort(404);
        }

        $this->assertTemplateForReservation($reservation, $template);

        return $template;
    }

    private function assertCanPrepare(Reservation $reservation): void
    {
        if ($reservation->isContractSigning()
            || $reservation->isContractIssued()
            || $reservation->isSold()
            || $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractIssued)) {
            throw ValidationException::withMessages([
                'reservation' => 'O contrato já foi aceito.',
            ]);
        }

        $ready = $reservation->isContractDataPending()
            || $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::DepositProofApproved)
            || $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::ContractDataSubmitted);

        if (! $ready) {
            throw ValidationException::withMessages([
                'reservation' => 'A reserva não está na etapa de emissão de contrato.',
            ]);
        }
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

    private function assertClientSnapshot(Reservation $reservation): void
    {
        $proposal = $reservation->proposals()->latest('version')->first();
        $missing = [];

        if (trim((string) $proposal?->client_cpf) === '') {
            $missing['client_cpf'][] = 'Informe o CPF do cliente antes de emitir o contrato.';
        }

        if (trim((string) $proposal?->address) === '') {
            $missing['address'][] = 'Informe o endereço do cliente antes de emitir o contrato.';
        }

        if ($missing !== []) {
            throw ValidationException::withMessages($missing);
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
        $readyFromProposal = $reservation->isContractDataPending()
            || $this->timelineService->hasEventType($reservation, ReservationTimelineEventType::DepositProofApproved);

        if (! $reservation->isContractIssued() && ! $hasContractData && ! $readyFromProposal) {
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
