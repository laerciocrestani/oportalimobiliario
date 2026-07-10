<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\Response;

/**
 * @see REQ-PUB-010
 */
class PublicSeoController extends Controller
{
    public function sitemap(): Response
    {
        $baseUrl = rtrim(config('app.public_site_url', 'http://www.localhost:4321'), '/');

        $buildings = Building::query()
            ->where('published', true)
            ->orderBy('name')
            ->get(['slug', 'updated_at']);

        $lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            $this->urlEntry("{$baseUrl}/", now()->toAtomString()),
        ];

        foreach ($buildings as $building) {
            $lines[] = $this->urlEntry(
                "{$baseUrl}/empreendimentos/{$building->slug}",
                $building->updated_at?->toAtomString() ?? now()->toAtomString(),
            );
        }

        $lines[] = '</urlset>';

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }

    public function robots(): Response
    {
        $baseUrl = rtrim(config('app.public_site_url', 'http://www.localhost:4321'), '/');

        $content = implode("\n", [
            'User-agent: *',
            'Allow: /',
            "Sitemap: {$baseUrl}/sitemap.xml",
            '',
        ]);

        return response($content, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }

    private function urlEntry(string $loc, string $lastmod): string
    {
        return "  <url>\n    <loc>{$loc}</loc>\n    <lastmod>{$lastmod}</lastmod>\n  </url>";
    }
}
