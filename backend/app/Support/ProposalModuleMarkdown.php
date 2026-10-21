<?php

namespace App\Support;

final class ProposalModuleMarkdown
{
    private const MAX_ROWS = 12;

    /**
     * @var list<string>
     */
    private const FIXED_SLUGS = [
        'reforco_1_valor',
        'reforco_1_vencimento',
        'reforco_2_valor',
        'reforco_2_vencimento',
        'reforco_3_valor',
        'reforco_3_vencimento',
        'reforco_4_valor',
        'reforco_4_vencimento',
        'dacao_1',
        'dacao_2',
        'dacao_3',
    ];

    /**
     * @param  array<string, mixed>  $values
     */
    public static function expand(string $markdown, array $values): string
    {
        $fixed = ($values['correcao_modo'] ?? 'incc') === 'fixed';
        $markdown = str_replace('{bloco_preco_unidade}', self::priceBlock(
            $fixed ? 'Valor da unidade' : 'Valor corrigido da unidade',
            $values['preco_unidade_corrigido'] ?? '',
            $fixed ? '' : ($values['preco_unidade_original'] ?? ''),
        ), $markdown);
        $markdown = str_replace('{bloco_preco_vaga}', self::priceBlock(
            $fixed ? 'Valor da vaga' : 'Valor corrigido da vaga',
            $values['preco_vaga_corrigido'] ?? '',
            $fixed ? '' : ($values['preco_vaga_original'] ?? ''),
        ), $markdown);
        $markdown = str_replace(
            '{correcao_parcelas}',
            $fixed
                ? '> As parcelas permanecem no valor contratado, sem correção pelo INCC.'
                : '> As parcelas serão corrigidas mensalmente pelo saldo positivo do INCC a partir da data de assinatura do contrato.',
            $markdown,
        );
        $markdown = str_replace(
            '{correcao_reforcos}',
            $fixed
                ? '> Os reforços permanecem no valor contratado, sem correção pelo INCC.'
                : '> Os reforços serão corrigidos mensalmente pelo saldo positivo do INCC a partir da data de assinatura do contrato.',
            $markdown,
        );
        $markdown = str_replace('{reforcos}', self::reinforcementBlock($values), $markdown);

        return str_replace('{dacoes}', self::dationBlock($values), $markdown);
    }

    public static function replaceFixedBlocks(string $markdown): string
    {
        $markdown = preg_replace(
            '/(?:\*\*Valor:\*\*\s+R\$\s+\{\{\s*reforco_\d+_valor\s*\??\s*\}\}\s*·\s*\*\*Venc\.:\*\*\s+\{\{\s*reforco_\d+_vencimento\s*\??\s*\}\}\s*(?:\R+|$))+/u',
            "{reforcos}\n\n",
            $markdown,
        ) ?? $markdown;

        return preg_replace(
            '/(?:\*\*Dação\s+\d+:\*\*\s+\{\{\s*dacao_\d+\s*\??\s*\}\}\s*(?:\R+|$))+/u',
            "{dacoes}\n\n",
            $markdown,
        ) ?? $markdown;
    }

    /**
     * @param  list<array<string, mixed>>  $variables
     * @return list<array<string, mixed>>
     */
    public static function withoutFixedVariables(array $variables): array
    {
        return array_values(array_filter(
            $variables,
            fn (array $variable): bool => ! in_array($variable['slug'] ?? '', self::FIXED_SLUGS, true),
        ));
    }

    private static function priceBlock(string $label, mixed $amount, mixed $original): string
    {
        $amountText = self::plain($amount);

        if ($amountText === '') {
            return '';
        }

        $originalText = self::plain($original);
        $suffix = $originalText === '' ? '' : " (original R$ {$originalText})";

        return "**{$label}:** R$ {$amountText}{$suffix}";
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private static function reinforcementBlock(array $values): string
    {
        $lines = [];

        for ($index = 1; $index <= self::MAX_ROWS; $index++) {
            $valor = self::plain($values["reforco_{$index}_valor"] ?? '');
            $vencimento = self::plain($values["reforco_{$index}_vencimento"] ?? '');

            if ($valor === '' && $vencimento === '') {
                continue;
            }

            $parts = [];

            if ($valor !== '') {
                $parts[] = '**Valor:** R$ '.$valor;
            }

            if ($vencimento !== '') {
                $parts[] = '**Venc.:** '.$vencimento;
            }

            $lines[] = implode(' · ', $parts);
        }

        return implode("\n\n", $lines);
    }

    /**
     * @param  array<string, mixed>  $values
     */
    private static function dationBlock(array $values): string
    {
        $lines = [];

        for ($index = 1; $index <= self::MAX_ROWS; $index++) {
            $description = self::plain($values["dacao_{$index}"] ?? '');

            if ($description === '') {
                continue;
            }

            $lines[] = '**Dação '.(count($lines) + 1).':** '.$description;
        }

        return implode("\n\n", $lines);
    }

    private static function plain(mixed $value): string
    {
        $text = trim(strip_tags((string) $value));

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
