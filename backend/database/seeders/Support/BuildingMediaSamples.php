<?php

namespace Database\Seeders\Support;

use RuntimeException;

final class BuildingMediaSamples
{
    /**
     * @return list<string>
     */
    public static function candidateDirectories(): array
    {
        return [
            base_path('../sample'),
            '/var/www/sample',
        ];
    }

    public static function directory(): string
    {
        foreach (self::candidateDirectories() as $path) {
            if (is_dir($path)) {
                return $path;
            }
        }

        throw new RuntimeException('Pasta sample não encontrada.');
    }

    public static function path(string $number): string
    {
        $padded = str_pad($number, 2, '0', STR_PAD_LEFT);

        foreach (["{$padded}.jpg", "{$padded}.jpeg", "{$padded}.png"] as $filename) {
            $path = self::directory().'/'.$filename;

            if (is_file($path)) {
                return $path;
            }
        }

        throw new RuntimeException("Arquivo sample {$padded} não encontrado.");
    }

    public static function contents(string $number): string
    {
        $contents = file_get_contents(self::path($number));

        if ($contents === false) {
            throw new RuntimeException('Não foi possível ler o arquivo sample.');
        }

        return $contents;
    }

    public static function mimeType(string $number): string
    {
        $mimeType = (new \finfo(FILEINFO_MIME_TYPE))->file(self::path($number));

        return is_string($mimeType) ? $mimeType : 'application/octet-stream';
    }

    public static function extension(string $number): string
    {
        return pathinfo(self::path($number), PATHINFO_EXTENSION) ?: 'jpg';
    }
}
