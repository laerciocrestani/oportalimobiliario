<?php

namespace App\Support;

final class ContractSystemVariables
{
    /**
     * @return list<array{slug: string, label: string, group: string}>
     */
    public static function catalog(): array
    {
        return [
            ['slug' => 'nome_cliente', 'label' => 'Nome do cliente', 'group' => 'cliente'],
            ['slug' => 'telefone_cliente', 'label' => 'Telefone do cliente', 'group' => 'cliente'],
            ['slug' => 'email_cliente', 'label' => 'E-mail do cliente', 'group' => 'cliente'],
            ['slug' => 'cpf_cliente', 'label' => 'CPF do cliente', 'group' => 'cliente'],
            ['slug' => 'rg_cliente', 'label' => 'RG do cliente', 'group' => 'cliente'],
            ['slug' => 'nacionalidade_cliente', 'label' => 'Nacionalidade do cliente', 'group' => 'cliente'],
            ['slug' => 'estado_civil', 'label' => 'Estado civil', 'group' => 'cliente'],
            ['slug' => 'endereco_cliente', 'label' => 'Endereço do cliente', 'group' => 'cliente'],
            ['slug' => 'cidade_cliente', 'label' => 'Cidade do cliente', 'group' => 'cliente'],
            ['slug' => 'uf_cliente', 'label' => 'UF do cliente', 'group' => 'cliente'],
            ['slug' => 'cep_cliente', 'label' => 'CEP do cliente', 'group' => 'cliente'],
            ['slug' => 'nome_conjuge', 'label' => 'Nome do cônjuge', 'group' => 'conjuge'],
            ['slug' => 'telefone_conjuge', 'label' => 'Telefone do cônjuge', 'group' => 'conjuge'],
            ['slug' => 'email_conjuge', 'label' => 'E-mail do cônjuge', 'group' => 'conjuge'],
            ['slug' => 'cpf_conjuge', 'label' => 'CPF do cônjuge', 'group' => 'conjuge'],
            ['slug' => 'rg_conjuge', 'label' => 'RG do cônjuge', 'group' => 'conjuge'],
            ['slug' => 'nacionalidade_conjuge', 'label' => 'Nacionalidade do cônjuge', 'group' => 'conjuge'],
            ['slug' => 'codigo_unidade', 'label' => 'Código da unidade', 'group' => 'unidade'],
            ['slug' => 'andar_unidade', 'label' => 'Andar da unidade', 'group' => 'unidade'],
            ['slug' => 'area_unidade', 'label' => 'Área da unidade (m²)', 'group' => 'unidade'],
            ['slug' => 'nome_empreendimento', 'label' => 'Nome do empreendimento', 'group' => 'unidade'],
            ['slug' => 'preco_final', 'label' => 'Preço final (R$)', 'group' => 'unidade'],
            ['slug' => 'valor_terreno', 'label' => 'Valor do terreno', 'group' => 'proposta'],
            ['slug' => 'condicoes_pagamento', 'label' => 'Condições de pagamento', 'group' => 'proposta'],
            ['slug' => 'nome_corretor', 'label' => 'Nome do corretor', 'group' => 'emissao'],
            ['slug' => 'data_emissao', 'label' => 'Data de emissão', 'group' => 'emissao'],
        ];
    }

    /**
     * @return list<string>
     */
    public static function slugs(): array
    {
        return array_column(self::catalog(), 'slug');
    }
}
