<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

class ContractPdfRenderer
{
    /**
     * @param  array<string, string>  $values
     */
    public function render(string $markdown, array $values): string
    {
        $html = Str::markdown($markdown, [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);

        $html = preg_replace_callback(
            '/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/',
            function (array $matches) use ($values): string {
                return e($values[$matches[1]] ?? '');
            },
            $html,
        ) ?? $html;

        $document = <<<HTML
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
                h1, h2, h3 { margin-bottom: 0.4em; }
                p { line-height: 1.45; }
            </style>
        </head>
        <body>{$html}</body>
        </html>
        HTML;

        return Pdf::loadHTML($document)->setPaper('a4')->output();
    }
}
