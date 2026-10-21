<?php

namespace App\Services;

use App\Enums\ReservationAttachmentKind;
use App\Enums\ReservationTimelineEventType;
use App\Models\ProposalTemplate;
use App\Models\Reservation;
use App\Models\ReservationAttachment;
use App\Models\ReservationProposal;
use App\Models\User;
use App\Support\CommercialProposalTemplate;
use App\Support\ContractSystemVariables;
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
     * Modelos ativos da construtora dona da reserva, para o corretor preencher no envio.
     *
     * @return list<array{id: int, name: string, body_markdown: string, variables: list<array{slug: string, label: string}>, prefill: object}>
     */
    public function listForBroker(Reservation $reservation): array
    {
        $reservation->loadMissing(['client']);
        CommercialProposalTemplate::sync((int) $reservation->tenant_id);

        $systemValues = $this->resolver->systemValues($reservation);
        $catalog = collect(ContractSystemVariables::catalog())->keyBy('slug');
        $autoSlugs = [
            'nome_cliente',
            'telefone_cliente',
            'email_cliente',
            'codigo_unidade',
            'nome_empreendimento',
            'box',
            'preco_final',
            'nome_corretor',
            'data_emissao',
        ];
        $contextSlugs = [
            'nome_empreendimento',
            'codigo_unidade',
            'box',
            'imobiliaria',
            'nome_corretor',
            'data_emissao',
            'preco_final',
            'preco_unidade_original',
            'preco_unidade_corrigido',
            'preco_vaga_original',
            'preco_vaga_corrigido',
        ];

        return ProposalTemplate::query()
            ->withoutGlobalScope('tenant')
            ->where('tenant_id', $reservation->tenant_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (ProposalTemplate $template) use ($systemValues, $catalog, $autoSlugs, $contextSlugs): array {
                $optional = array_flip($this->resolver->optionalPlaceholderSlugs($template->body_markdown));
                $customLabels = collect($template->custom_variables ?? [])
                    ->mapWithKeys(function (mixed $variable): array {
                        if (! is_array($variable)) {
                            return [];
                        }

                        $slug = (string) ($variable['slug'] ?? '');

                        return $slug === '' ? [] : [$slug => (string) ($variable['label'] ?? '')];
                    });

                $variables = [];
                $prefill = [];

                foreach ($this->resolver->extractPlaceholders($template->body_markdown) as $slug) {
                    if (in_array($slug, $autoSlugs, true)) {
                        $value = trim((string) ($systemValues[$slug] ?? ''));

                        if ($value !== '') {
                            $prefill[$slug] = $value;
                        }
                    }

                    if (in_array($slug, $contextSlugs, true)) {
                        continue;
                    }

                    $customLabel = $customLabels->get($slug);
                    $catalogEntry = $catalog->get($slug);
                    $catalogLabel = is_array($catalogEntry) ? ($catalogEntry['label'] ?? null) : null;
                    $variables[] = [
                        'slug' => $slug,
                        'label' => (is_string($customLabel) && $customLabel !== '')
                            ? $customLabel
                            : (is_string($catalogLabel) && $catalogLabel !== '' ? $catalogLabel : str_replace('_', ' ', $slug)),
                        'required' => ! isset($optional[$slug]),
                    ];
                }

                return [
                    'id' => $template->id,
                    'name' => $template->name,
                    'body_markdown' => $template->body_markdown,
                    'variables' => $variables,
                    'prefill' => (object) $prefill,
                ];
            })
            ->all();
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    public function activeTemplates(Reservation $reservation): array
    {
        $this->assertCanIssue($reservation);

        $template = CommercialProposalTemplate::sync((int) $reservation->tenant_id);

        return [[
            'id' => $template->id,
            'name' => $template->name,
        ]];
    }

    public function resolve(Reservation $reservation, int $templateId): ProposalTemplate
    {
        $commercial = CommercialProposalTemplate::sync((int) $reservation->tenant_id);
        $template = ProposalTemplate::query()->withoutGlobalScope('tenant')->find($templateId);

        if ($template === null || (int) $template->id !== (int) $commercial->id) {
            abort(404);
        }

        return $commercial;
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

    public function storeAcceptancePdf(User $actor, Reservation $reservation, ReservationProposal $proposal): ReservationAttachment
    {
        $existing = $reservation->attachments()
            ->where('kind', ReservationAttachmentKind::ProposalPdf)
            ->latest('id')
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $pdf = $this->renderer->render(
            $this->acceptanceMarkdown($reservation),
            $this->resolver->systemValues($reservation),
        );

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
            'original_name' => 'proposta.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => strlen($pdf),
            'uploaded_by' => $actor->id,
        ]);

        $this->timelineService->record(
            $reservation,
            ReservationTimelineEventType::ProposalPdfIssued,
            $actor,
            ['attachment_id' => $attachment->id],
        );

        return $attachment;
    }

    private function acceptanceMarkdown(Reservation $reservation): string
    {
        return CommercialProposalTemplate::sync((int) $reservation->tenant_id)->body_markdown;
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
