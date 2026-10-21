<?php

use App\Support\ProposalModuleMarkdown;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('proposal_templates')->orderBy('id')->each(function (object $template): void {
            $variables = json_decode($template->custom_variables ?? '[]', true);
            $variables = is_array($variables) ? $variables : [];
            $body = ProposalModuleMarkdown::replaceFixedBlocks($template->body_markdown);
            $nextVariables = ProposalModuleMarkdown::withoutFixedVariables($variables);

            if ($body === $template->body_markdown && $nextVariables === array_values($variables)) {
                return;
            }

            DB::table('proposal_templates')->where('id', $template->id)->update([
                'body_markdown' => $body,
                'custom_variables' => json_encode($nextVariables, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        // As linhas numeradas de reforço e dação não são restauradas.
    }
};
