<?php

namespace App\Support;

use App\Enums\BuildingCategory;
use App\Enums\PartyKind;
use App\Models\Building;
use App\Models\Reservation;
use App\Models\TenantSignatureSetting;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Number;

/**
 * Frases do documento particular de proposta, montadas com os dados já gravados.
 */
final class PurchaseProposalClauses
{
    /**
     * @param  array<string, string>  $values
     * @return array<string, string>
     */
    public static function augment(array $values, Reservation $reservation, mixed $price): array
    {
        $reservation->loadMissing(['unit.building', 'unit.tower', 'tenant', 'garageUnits']);
        $proposal = $reservation->proposals->sortByDesc('version')->first();
        $building = $reservation->unit?->building;
        $unit = $reservation->unit;
        $place = self::place(
            self::text($building?->city),
            self::text($building?->state),
        );
        $address = self::buildingAddress($building);
        $builderName = self::text($reservation->tenant?->name);

        $values['local_data'] = self::join([
            $place,
            now('America/Sao_Paulo')->locale('pt_BR')->translatedFormat('j \d\e F \d\e Y'),
        ], ', ');
        $values['qualificacao_comprador'] = self::buyer(
            $values,
            $proposal?->party_kind === PartyKind::Company,
        );
        $values['qualificacao_corretor'] = self::broker($values['nome_corretor'] ?? '');
        $values['qualificacao_construtora'] = self::builder(
            $builderName,
            self::representative($reservation),
        );
        $values['nome_construtora'] = $builderName;
        $values['tipo_unidade'] = self::unitKind($building?->category);
        $values['endereco_empreendimento'] = $address;
        $values['texto_empreendimento'] = self::join([
            self::text($building?->name) !== '' ? 'denominado '.self::text($building?->name) : '',
            $address !== '' ? "situado à {$address}" : '',
        ]);
        $values['vagas_garagem'] = self::garageLabel($reservation);
        $values['dados_unidade'] = self::unitData($unit, $building, $address, $values['tipo_unidade'], $values['vagas_garagem']);
        $values['indice_correcao'] = ($values['correcao_modo'] ?? 'incc') === 'fixed'
            ? 'Sem correção monetária'
            : 'INCC';
        $values['foro'] = $place;
        $values['texto_foro'] = $place !== ''
            ? "As partes elegem o foro da comarca de {$place} para dirimir quaisquer dúvidas oriundas deste contrato."
            : 'As partes elegem o foro da comarca do imóvel para dirimir quaisquer dúvidas oriundas deste contrato.';
        $values['descricao_imovel'] = self::property(
            self::text($unit?->code),
            self::text($building?->name),
            $address,
            self::area($unit?->private_area_m2 ?? $unit?->area_m2),
            self::area($unit?->total_area_m2),
            $unit?->bedrooms,
            $unit?->suites,
            $reservation->garageUnits->count(),
        );
        $values['texto_matricula'] = 'Matrícula do Cartório de Registro de Imóveis'
            .($place !== '' ? " de {$place}" : '')
            .'.';
        $values['preco_por_extenso'] = self::moneyInWords($price);

        return $values;
    }

    public static function moneyInWords(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $cents = (int) round(((float) $value) * 100);
        $reais = intdiv($cents, 100);
        $centavos = $cents % 100;
        $reaisLabel = $reais === 1 ? 'real' : 'reais';
        $words = Number::spell($reais, locale: 'pt_BR').' '.$reaisLabel;

        if ($centavos === 0) {
            return $words;
        }

        $centavosLabel = $centavos === 1 ? 'centavo' : 'centavos';

        return $words.' e '.Number::spell($centavos, locale: 'pt_BR').' '.$centavosLabel;
    }

    /**
     * @param  array<string, string>  $values
     */
    private static function buyer(array $values, bool $company): string
    {
        $address = self::join([
            $values['endereco_cliente'] ?? '',
            self::place($values['cidade_cliente'] ?? '', $values['uf_cliente'] ?? ''),
            self::cep($values['cep_cliente'] ?? ''),
        ]);
        $document = $values['cpf_cliente'] ?? '';
        $parts = [self::text($values['nome_cliente'] ?? '')];

        if ($company) {
            if ($document !== '') {
                $parts[] = "inscrita no CNPJ nº {$document}";
            }

            if ($address !== '') {
                $parts[] = "com sede à {$address}";
            }
        } else {
            foreach ([
                $values['nacionalidade_cliente'] ?? '',
                $values['estado_civil'] ?? '',
                $values['profissao_cliente'] ?? '',
            ] as $detail) {
                $detail = self::text($detail);

                if ($detail !== '') {
                    $parts[] = $detail;
                }
            }

            if ($document !== '') {
                $parts[] = "portador do CPF nº {$document}";
            }

            $rg = self::text($values['rg_cliente'] ?? '');

            if ($rg !== '') {
                $parts[] = "RG nº {$rg}";
            }

            if ($address !== '') {
                $parts[] = "residente e domiciliado à {$address}";
            }
        }

        $parts = array_values(array_filter($parts, fn (string $part): bool => $part !== ''));

        return $parts === [] ? '' : implode(', ', $parts).'.';
    }

    private static function broker(string $name): string
    {
        $name = self::text($name);

        if ($name === '') {
            return 'intermediador da presente negociação.';
        }

        return "{$name}, intermediador da presente negociação.";
    }

    private static function builder(string $name, string $representative): string
    {
        $parts = [];

        if ($name !== '') {
            $parts[] = $name;
        }

        if ($representative !== '') {
            $parts[] = "neste ato representada por {$representative}";
        }

        return $parts === [] ? '' : implode(', ', $parts).'.';
    }

    private static function unitKind(?BuildingCategory $category): string
    {
        return match ($category) {
            BuildingCategory::Residential => 'Residencial',
            BuildingCategory::Commercial => 'Comercial',
            BuildingCategory::Mixed => 'Misto',
            default => '',
        };
    }

    private static function garageLabel(Reservation $reservation): string
    {
        $codes = $reservation->garageUnits
            ->pluck('code')
            ->map(fn (mixed $code): string => self::text($code))
            ->filter(fn (string $code): bool => $code !== '')
            ->values();
        $count = $reservation->garageUnits->count();

        if ($count === 0) {
            return '';
        }

        $label = $count.' '.($count === 1 ? 'vaga' : 'vagas');

        return $codes->isEmpty() ? $label : $label.' — '.$codes->implode(', ');
    }

    private static function unitData(?Unit $unit, ?Building $building, string $address, string $kind, string $garages): string
    {
        $private = self::area($unit?->private_area_m2 ?? $unit?->area_m2);
        $total = self::area($unit?->total_area_m2);
        $rows = [
            'Tipo de unidade' => $kind,
            'Número da unidade' => self::text($unit?->code),
            'Bloco / Torre' => self::text($unit?->tower?->name),
            'Pavimento' => self::floorLabel($unit?->floor),
            'Área privativa' => $private !== '' ? "{$private} m²" : '',
            'Área comum' => self::commonArea($unit),
            'Área total' => $total !== '' ? "{$total} m²" : '',
            'Vagas de garagem' => $garages,
            'Endereço do empreendimento' => $address,
            'Empreendimento' => self::text($building?->name),
        ];
        $lines = ['**Dados da unidade**'];

        foreach ($rows as $label => $value) {
            if ($value === '') {
                continue;
            }

            $lines[] = "- **{$label}:** {$value}";
        }

        return count($lines) === 1 ? '' : implode("\n", $lines);
    }

    private static function floorLabel(mixed $floor): string
    {
        if ($floor === null || $floor === '') {
            return '';
        }

        $number = (int) $floor;

        return $number === 0 ? 'Térreo' : "{$number}º pavimento";
    }

    private static function commonArea(?Unit $unit): string
    {
        if ($unit?->private_area_m2 === null || $unit?->total_area_m2 === null) {
            return '';
        }

        $common = (float) $unit->total_area_m2 - (float) $unit->private_area_m2;

        if ($common <= 0) {
            return '';
        }

        $formatted = self::area($common);

        return $formatted === '' ? '' : "{$formatted} m²";
    }

    private static function property(
        string $code,
        string $building,
        string $address,
        string $privateArea,
        string $totalArea,
        mixed $bedrooms,
        mixed $suites,
        int $garageSpots,
    ): string {
        $intro = $code !== '' ? "unidade nº {$code}" : 'unidade';
        $location = array_filter([
            $intro,
            $building !== '' ? "no empreendimento {$building}" : '',
            $address !== '' ? "localizado à {$address}" : '',
        ]);
        $details = array_filter([
            $privateArea !== '' ? "área privativa de {$privateArea} m²" : '',
            $totalArea !== '' ? "área total de {$totalArea} m²" : '',
            self::countLabel($bedrooms, 'quarto', 'quartos'),
            self::countLabel($suites, 'suíte', 'suítes'),
            self::countLabel($garageSpots > 0 ? $garageSpots : null, 'vaga de garagem', 'vagas de garagem'),
        ]);
        $text = 'Descrição: '.implode(', ', $location);

        if ($details !== []) {
            $text .= ', com '.implode(', ', $details);
        }

        return $text.'.';
    }

    private static function representative(Reservation $reservation): string
    {
        $setting = TenantSignatureSetting::query()
            ->withoutGlobalScope('tenant')
            ->where('tenant_id', $reservation->tenant_id)
            ->first();

        if ($setting?->proposal_signer_user_id === null) {
            return '';
        }

        return self::text(User::query()->find($setting->proposal_signer_user_id)?->name);
    }

    private static function buildingAddress(?Building $building): string
    {
        if ($building === null) {
            return '';
        }

        return self::join([
            self::join([self::text($building->street), self::text($building->number)], ', '),
            self::text($building->complement),
            self::text($building->neighborhood),
            self::place(self::text($building->city), self::text($building->state)),
            self::cep(self::text($building->zip)),
        ]);
    }

    private static function countLabel(mixed $value, string $singular, string $plural): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $count = (int) $value;

        return $count.' '.($count === 1 ? $singular : $plural);
    }

    private static function area(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return Number::format((float) $value, precision: 2, locale: 'pt_BR');
    }

    private static function place(string $city, string $state): string
    {
        $city = self::text($city);
        $state = self::text($state);

        if ($city !== '' && $state !== '') {
            return "{$city}/{$state}";
        }

        return $city !== '' ? $city : $state;
    }

    private static function cep(string $value): string
    {
        $digits = preg_replace('/\D+/', '', self::text($value)) ?? '';

        if (strlen($digits) !== 8) {
            return self::text($value);
        }

        return 'CEP '.substr($digits, 0, 5).'-'.substr($digits, 5, 3);
    }

    /**
     * @param  list<string>  $parts
     */
    private static function join(array $parts, string $separator = ', '): string
    {
        return implode($separator, array_values(array_filter(
            array_map(fn (string $part): string => self::text($part), $parts),
            fn (string $part): bool => $part !== '',
        )));
    }

    private static function text(mixed $value): string
    {
        return trim((string) $value);
    }
}
